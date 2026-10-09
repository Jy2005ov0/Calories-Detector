import { describe, expect, it } from "vitest";
import { mergeStates } from "./merge";
import { DEFAULT_PROFILE, INITIAL_STATE, type AppState } from "./store";
import type { LogEntry, WorkoutSession } from "./types";

const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 };
const entry = (id: string, createdAt: number): LogEntry => ({ id, createdAt, date: "2026-10-12", meal: "lunch", name: id, grams: 100, nutrients: ZERO, source: "db" });
const session = (id: string, startedAt: number, endedAt?: number): WorkoutSession => ({ id, date: "2026-10-12", title: id, startedAt, endedAt, exercises: [], kcal: 0 });
const state = (p: Partial<AppState>): AppState => ({ ...INITIAL_STATE, ...p, stamps: { ...p.stamps } });

describe("mergeStates", () => {
  it("keeps entries logged on both phones", () => {
    const phone = state({ log: [entry("a", 1), entry("c", 3)], stamps: { log: 3 } });
    const cloud = state({ log: [entry("b", 2)], stamps: { log: 2 } });
    expect(mergeStates(phone, cloud).log.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("doesn't bring back something deleted on the other phone", () => {
    const phone = state({ log: [entry("a", 1)], stamps: { log: 1 } });
    const cloud = state({ log: [], deleted: ["a"], stamps: { log: 5 } });
    const merged = mergeStates(phone, cloud);
    expect(merged.log).toEqual([]);
    expect(merged.deleted).toContain("a");
  });

  it("takes the most recently edited copy of the same workout", () => {
    const older = { ...session("w", 100), exercises: [] };
    const newer = { ...session("w", 100, 200), kcal: 300 };
    expect(mergeStates(state({ sessions: [older], stamps: { sessions: 1 } }), state({ sessions: [newer], stamps: { sessions: 9 } })).sessions[0].kcal).toBe(300);
    expect(mergeStates(state({ sessions: [newer], stamps: { sessions: 9 } }), state({ sessions: [older], stamps: { sessions: 1 } })).sessions[0].kcal).toBe(300);
  });

  it("a finished workout isn't undone by a stale copy from a phone that changed another workout later", () => {
    const finished = { ...session("w", 100, 200), kcal: 350, updatedAt: 210 };
    const stale = session("w", 100);
    const phoneA = state({ sessions: [finished], stamps: { sessions: 210 } });
    const phoneB = state({ sessions: [stale, { ...session("v", 300), updatedAt: 400 }], stamps: { sessions: 400 } });
    for (const merged of [mergeStates(phoneA, phoneB), mergeStates(phoneB, phoneA)]) {
      const w = merged.sessions.find((s) => s.id === "w")!;
      expect(w.endedAt).toBe(200);
      expect(w.kcal).toBe(350);
    }
  });

  it("Delete all data wins over older synced copies", () => {
    const reset = state({ resetAt: 1000, profile: { ...DEFAULT_PROFILE, onboarded: false }, stamps: { log: 1000, profile: 1000, sessions: 1000 } });
    const cloud = state({ log: [entry("a", 10), entry("b", 20)], sessions: [session("w", 30, 40)], profile: { ...DEFAULT_PROFILE, onboarded: true }, stamps: { log: 500, profile: 500, sessions: 500 } });
    for (const merged of [mergeStates(reset, cloud), mergeStates(cloud, reset)]) {
      expect(merged.log).toEqual([]);
      expect(merged.sessions).toEqual([]);
      expect(merged.profile.onboarded).toBe(false);
      expect(merged.resetAt).toBe(1000);
    }
    // Anything logged after the reset is kept.
    const after = state({ resetAt: 1000, log: [entry("c", 1100)], stamps: { log: 1100 } });
    expect(mergeStates(after, cloud).log.map((e) => e.id)).toEqual(["c"]);
  });

  it("merges settings field by field", () => {
    // Weight changed on the phone; split changed later in the cloud. Both survive.
    const phone = state({ profile: { ...DEFAULT_PROFILE, weightKg: 80, onboarded: true }, split: "auto", stamps: { profile: 10, split: 1 } });
    const cloud = state({ profile: { ...DEFAULT_PROFILE, weightKg: 75, onboarded: true }, split: "ppl", stamps: { profile: 5, split: 20 } });
    const merged = mergeStates(phone, cloud);
    expect(merged.profile.weightKg).toBe(80);
    expect(merged.split).toBe("ppl");
  });

  it("a new phone that signs in gets the account's profile", () => {
    const freshPhone = state({});
    const cloud = state({ profile: { ...DEFAULT_PROFILE, name: "Aiman", onboarded: true }, stamps: { profile: 5 } });
    expect(mergeStates(freshPhone, cloud).profile).toMatchObject({ name: "Aiman", onboarded: true });
  });

  it("drops a running workout that no longer exists", () => {
    const phone = state({ activeSessionId: "w", sessions: [session("w", 1)], stamps: { activeSessionId: 9, sessions: 1 } });
    const cloud = state({ deleted: ["w"], stamps: { sessions: 5 } });
    expect(mergeStates(phone, cloud).activeSessionId).toBeNull();
  });

  it("is stable: merging again changes nothing", () => {
    const a = state({ log: [entry("a", 1)], stamps: { log: 1 } });
    const b = state({ log: [entry("b", 2)], deleted: ["x"], stamps: { log: 2 } });
    const once = mergeStates(a, b);
    expect(mergeStates(once, b)).toEqual(once);
  });
});
