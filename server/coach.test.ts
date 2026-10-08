import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import type Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { coachRouter } from "./coach";

/** A stand-in for the Anthropic client that streams a fixed reply and records the request. */
function fakeClient(reply: string[], stopReason = "end_turn") {
  const calls: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: Record<string, unknown>) {
          calls.push(params);
          return {
            async *[Symbol.asyncIterator]() {
              for (const text of reply) yield { type: "content_block_delta", delta: { type: "text_delta", text } };
            },
            finalMessage: async () => ({ stop_reason: stopReason, content: [] }),
          };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

let server: Server;
let base = "";
const fake = fakeClient(["Have ", "grilled fish ", "with rice."]);

beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use("/api/coach", coachRouter(() => fake.client));
  app.use("/api/coach-off", coachRouter(() => null));
  server = app.listen(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const post = (path: string, body: unknown) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("coach endpoint", () => {
  it("streams the reply as plain text", async () => {
    const res = await post("/api/coach", { messages: [{ role: "user", text: "What should I eat?" }], context: { kcalLeft: 600 } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("Have grilled fish with rice.");
  });

  it("sends the app's numbers with the latest question and keeps the system prompt stable", async () => {
    await post("/api/coach", {
      messages: [
        { role: "assistant", text: "Hi! Ask me anything." },
        { role: "user", text: "Hello" },
        { role: "assistant", text: "Hi" },
        { role: "user", text: "Dinner ideas?" },
      ],
      context: { kcalLeft: 512 },
    });
    const call = fake.calls[fake.calls.length - 1] as { model: string; messages: { role: string; content: string }[]; system: { text: string }[]; fallbacks: string };
    expect(call.model).toBe("claude-opus-5-5");
    expect(call.fallbacks).toBe("default");
    // A leading assistant greeting is dropped so the history starts with the person.
    expect(call.messages[0]).toEqual({ role: "user", content: "Hello" });
    expect(call.messages.at(-1)!.content).toContain('"kcalLeft":512');
    expect(call.messages.at(-1)!.content).toContain("Dinner ideas?");
    expect(call.system[0].text).not.toContain("512");
  });

  it("rejects bad requests", async () => {
    expect((await post("/api/coach", {})).status).toBe(400);
    expect((await post("/api/coach", { messages: [{ role: "assistant", text: "hi" }] })).status).toBe(400);
    expect((await post("/api/coach", { messages: [{ role: "user", text: "x".repeat(2001) }] })).status).toBe(400);
  });

  it("says when the server has no API key", async () => {
    const res = await post("/api/coach-off", { messages: [{ role: "user", text: "hi" }] });
    expect(res.status).toBe(503);
  });
});
