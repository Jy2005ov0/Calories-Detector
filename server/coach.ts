import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimiter } from "./auth";

const MODEL = "claude-opus-5-5";

const SYSTEM = `You are the coach inside "Calories", a calorie-counting and gym app used mostly in Malaysia and Southeast Asia.
You help one person with food choices, portions, training and habits, using the numbers the app gives you about them (targets, what they ate today, their plan, their workouts).
Be specific and practical: name real foods (including Malaysian and hawker foods), portions in everyday units, and the calories or protein involved. Do the arithmetic for them.
Keep replies short for a phone screen: a direct answer first, then at most 3–5 short bullet points. No headings. No tables.
Respect their diet, halal status and allergies from the context; never suggest a food they avoid.
You are not a doctor. For medical conditions, pregnancy, eating disorders, injuries or medication, give general guidance and suggest a doctor or dietitian.
Reply in the same language the person writes in.`;

const MAX_TURNS = 20;
const MAX_TEXT = 2000;

type Turn = { role: "user" | "assistant"; text: string };

function isTurn(x: unknown): x is Turn {
  const t = x as Turn;
  return !!t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string" && t.text.length > 0 && t.text.length <= MAX_TEXT;
}

/** POST /api/coach — streams the coach's reply as plain text. */
export function coachRouter(getClient: () => Anthropic | null) {
  const router = Router();
  const tooMany = rateLimiter(30, 10 * 60 * 1000);

  router.post("/", async (req, res) => {
    const anthropic = getClient();
    if (!anthropic) {
      res.status(503).json({ error: "The coach is not configured. Set ANTHROPIC_API_KEY on the server." });
      return;
    }
    if (tooMany(String(res.locals.aiKey ?? req.ip ?? "unknown"))) {
      res.status(429).json({ error: "You're asking very quickly. Wait a few minutes and try again." });
      return;
    }
    const { messages, context } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_TURNS || !messages.every(isTurn) || messages[messages.length - 1].role !== "user") {
      res.status(400).json({ error: "Send { messages: [{ role: 'user', text }], context }" });
      return;
    }
    const contextText = JSON.stringify(context ?? {}).slice(0, 8000);

    // History must start with the person; drop any leading coach greeting.
    const turns = (messages as Turn[]).slice(messages.findIndex((m: Turn) => m.role === "user"));
    const history: Anthropic.Beta.BetaMessageParam[] = turns.map((m) => ({ role: m.role, content: m.text }));
    // The app's numbers go into the latest turn so the cached system prompt stays the same for everyone.
    const last = history[history.length - 1];
    last.content = `<app_context>\n${contextText}\n</app_context>\n\n${turns[turns.length - 1].text}`;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    const abort = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) abort.abort();
    });

    try {
      const stream = anthropic.beta.messages.stream(
        {
          model: MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: history,
        },
        { signal: abort.signal },
      );
      let wrote = false;
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(event.delta.text);
          wrote = true;
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal" && !wrote) res.write("I can't help with that one. Try asking about your food, training or habits.");
      res.end();
    } catch (error) {
      if (abort.signal.aborted) return;
      const message =
        error instanceof Anthropic.RateLimitError
          ? "The coach is busy right now. Try again in a moment."
          : error instanceof Anthropic.AuthenticationError
            ? "The server's Anthropic API key is invalid."
            : error instanceof Anthropic.APIError
              ? `AI service error (${error.status ?? "network"}).`
              : "Unexpected server error.";
      if (!(error instanceof Anthropic.APIError)) console.error(error);
      if (!res.headersSent || !res.writableEnded) {
        if (res.headersSent) res.end(`\n\n${message}`);
        else res.status(502).json({ error: message });
      }
    }
  });
  return router;
}
