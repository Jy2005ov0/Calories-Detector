import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { authConfigFromEnv, authRouter, type AuthConfig } from "./auth";
import { openDb, type DB } from "./db";
import { syncRouter } from "./sync";
import { coachRouter } from "./coach";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const MODEL = "claude-opus-5-5";

const DetectedFood = z.object({
  name: z.string().describe("Common English name of the food, e.g. 'Fried egg'"),
  grams: z.number().describe("Estimated edible weight in grams on the plate"),
  calories: z.number().describe("Estimated kcal for that portion"),
  protein: z.number().describe("grams of protein for that portion"),
  carbs: z.number().describe("grams of carbohydrate for that portion"),
  fat: z.number().describe("grams of fat for that portion"),
  fiber: z.number(),
  sugar: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
});

const PhotoAnalysis = z.object({
  isFood: z.boolean().describe("false if the photo does not show food or drink"),
  mealName: z.string().describe("Short name for the whole meal, e.g. 'Nasi lemak with fried chicken'"),
  items: z.array(DetectedFood),
  notes: z.string().describe("One or two sentences on assumptions (oil, sauces, hidden ingredients)"),
});

const SYSTEM = `You are a registered dietitian estimating nutrition from meal photos.
Identify each distinct food or drink visible, including Asian and Malaysian dishes, and estimate the portion weight from visual cues (plate size ~26cm, utensils, hands, packaging).
Account for cooking oil, sauces, gravy and sugar in drinks. Use standard food-composition values (USDA / Malaysian food composition) for your numbers.
If something is ambiguous, pick the most likely interpretation and lower its confidence. Never invent foods that are not visible.`;

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  client ??= new Anthropic();
  return client;
}

export function createApp(db: DB = openDb(), authConfig: AuthConfig = authConfigFromEnv()) {
  const app = express();
  // Behind a proxy (Render, Fly, Railway…) so rate limits see the real client IP.
  app.set("trust proxy", 1);
  // The iOS and Android apps load from these local origins and call this server cross-origin.
  const NATIVE_ORIGINS = ["capacitor://localhost", "ionic://localhost", "https://localhost", "http://localhost"];
  const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  app.use("/api", cors({ origin: [...NATIVE_ORIGINS, ...extraOrigins] }));
  app.use(express.json({ limit: "12mb" }));
  app.use("/api/auth", authRouter(db, authConfig));
  app.use("/api/data", syncRouter(db));

  app.use("/api/coach", coachRouter(getClient));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, photoAnalysis: getClient() !== null, coach: getClient() !== null });
  });

  const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  type AllowedMedia = (typeof ALLOWED_MEDIA)[number];

  app.post("/api/analyze-photo", async (req, res) => {
    const anthropic = getClient();
    if (!anthropic) {
      res.status(503).json({ error: "Photo analysis is not configured. Set ANTHROPIC_API_KEY on the server." });
      return;
    }
    const { image, mediaType, hint } = req.body ?? {};
    if (typeof image !== "string" || !ALLOWED_MEDIA.includes(mediaType)) {
      res.status(400).json({ error: "Send { image: <base64>, mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }" });
      return;
    }

    try {
      const response = await anthropic.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(PhotoAnalysis) },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType as AllowedMedia, data: image } },
              {
                type: "text",
                text:
                  "Estimate the nutrition of this meal." +
                  (typeof hint === "string" && hint.trim() ? ` The user adds: "${hint.trim().slice(0, 300)}"` : ""),
              },
            ],
          },
        ],
      });

      if (response.stop_reason === "refusal") {
        res.status(422).json({ error: "The image could not be analysed. Try another photo." });
        return;
      }
      if (!response.parsed_output) {
        res.status(502).json({ error: "Could not read the analysis. Please try again." });
        return;
      }
      res.json(response.parsed_output);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        res.status(503).json({ error: "The server's Anthropic API key is invalid." });
      } else if (error instanceof Anthropic.RateLimitError) {
        res.status(429).json({ error: "Too many requests right now. Try again in a moment." });
      } else if (error instanceof Anthropic.BadRequestError) {
        res.status(400).json({ error: "That image could not be processed. Try a smaller JPEG or PNG." });
      } else if (error instanceof Anthropic.APIError) {
        res.status(502).json({ error: `AI service error (${error.status ?? "network"}).` });
      } else {
        console.error(error);
        res.status(500).json({ error: "Unexpected server error." });
      }
    }
  });

  if (process.env.NODE_ENV === "production") {
    const dist = path.resolve(here, "../dist");
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  return app;
}

// Run the server unless this file is imported (tests import createApp).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = openDb();
  setInterval(() => db.purgeSessions(), 60 * 60 * 1000).unref();
  createApp(db).listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT} (photo analysis ${getClient() ? "enabled" : "disabled"})`);
  });
}
