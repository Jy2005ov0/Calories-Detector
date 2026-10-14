import { describe, expect, it } from "vitest";
import { cycleStatus } from "./cycle";
import { cycleKcal, earlyWarnings, fertileDays, healthCheck, inFertileWindow, pastCycles, pillDay, qadaOwed, symptomPatterns, trainingTip } from "./cycleCare";
import { hashPin } from "./cycleLock";
import type { DayStats, PeriodEntry } from "./types";

const settings = { on: true, length: 28, periodDays: 5, remind: false };
const period = (date: string, end?: string): PeriodEntry => ({ id: date, date, end, createdAt: 0 });
const day = (id: string, x: Partial<DayStats>): DayStats => ({ id, waterMl: 0, ...x });

describe("symptom patterns", () => {
  const periods = [period("2026-07-01", "2026-07-05"), period("2026-07-29", "2026-08-02"), period("2026-08-26", "2026-08-30")];
  it("finds a symptom that comes at the same point before each period", () => {
    const days = [day("2026-07-27", { symptoms: ["headache"] }), day("2026-08-24", { symptoms: ["headache"] }), day("2026-08-25", { symptoms: ["headache"] })];
    const p = symptomPatterns(periods, days);
    expect(p).toEqual([{ symptom: "headache", when: "before", from: 2, to: 2, cycles: 2 }]);
  });
  it("finds one during the period, and ignores one-offs and scattered days", () => {
    const days = [
      day("2026-07-01", { symptoms: ["cramps"] }),
      day("2026-07-30", { symptoms: ["cramps", "acne"] }),
      day("2026-07-10", { symptoms: ["tired"] }),
      day("2026-08-20", { symptoms: ["bloating"] }),
      day("2026-07-28", { symptoms: ["bloating"] }),
    ];
    const p = symptomPatterns(periods, days);
    expect(p.find((x) => x.symptom === "cramps")).toMatchObject({ when: "during", from: 1, to: 2, cycles: 2 });
    expect(p.some((x) => x.symptom === "acne" || x.symptom === "tired")).toBe(false);
    // 6 days before one period and 1 day before the other: too far apart to be a pattern.
    expect(p.some((x) => x.symptom === "bloating")).toBe(false);
  });
  it("warns a day or two ahead", () => {
    const pattern = [{ symptom: "headache" as const, when: "before" as const, from: 2, to: 3, cycles: 3 }];
    const status = cycleStatus(settings, periods, "2026-09-20")!;
    expect(status.daysUntil).toBe(3);
    expect(earlyWarnings(pattern, status)).toHaveLength(1);
    expect(earlyWarnings(pattern, cycleStatus(settings, periods, "2026-09-10"))).toHaveLength(0);
  });
});

describe("health check", () => {
  it("regular cycles have nothing to flag", () => {
    const periods = ["2026-03-01", "2026-03-29", "2026-04-27", "2026-05-25", "2026-06-23"].map((d) => period(d));
    const check = healthCheck(pastCycles(periods, settings, []), [], periods, settings, "2026-07-01");
    expect(check).toMatchObject({ average: 29, shortest: 28, longest: 29, regular: true, flags: [] });
  });
  it("flags irregular, long and heavy cycles, and no period for 90 days", () => {
    const periods = ["2026-01-01", "2026-02-15", "2026-03-10", "2026-04-25"].map((d) => period(d));
    const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"].map((d) => day(d, { flow: "heavy" }));
    const check = healthCheck(pastCycles(periods, settings, days), days, periods, settings, "2026-08-01");
    expect(check.regular).toBe(false);
    expect(check.flags).toEqual(expect.arrayContaining(["long", "irregular", "heavy", "missed"]));
  });
  it("flags bleeding between periods", () => {
    const periods = [period("2026-06-01", "2026-06-05")];
    const days = ["2026-06-12", "2026-06-15", "2026-06-18"].map((d) => day(d, { flow: "spotting" }));
    expect(healthCheck(pastCycles(periods, settings, days), days, periods, settings, "2026-06-20").flags).toContain("between");
  });
});

describe("fertile window, training and food by phase", () => {
  const periods = [period("2026-09-01", "2026-09-05")];
  it("marks five days before ovulation to one after", () => {
    const { fertile, ovulation } = fertileDays(cycleStatus(settings, periods, "2026-09-03"));
    expect(ovulation.has("2026-09-15")).toBe(true);
    expect(fertile.has("2026-09-10")).toBe(true);
    expect(fertile.has("2026-09-16")).toBe(true);
    expect(fertile.has("2026-09-17")).toBe(false);
    expect(inFertileWindow(cycleStatus(settings, periods, "2026-09-12"))).toBe(true);
    expect(inFertileWindow(cycleStatus(settings, periods, "2026-09-20"))).toBe(false);
  });
  it("suggests lighter, harder or steady training", () => {
    expect(trainingTip(cycleStatus(settings, periods, "2026-09-01"))?.tone).toBe("lighter");
    expect(trainingTip(cycleStatus(settings, periods, "2026-09-08"))?.tone).toBe("push");
    expect(trainingTip(cycleStatus(settings, periods, "2026-09-20"))?.tone).toBe("steady");
    expect(trainingTip(cycleStatus(settings, periods, "2026-09-27"))?.tone).toBe("lighter");
  });
  it("adds calories in the luteal phase only when asked", () => {
    const luteal = cycleStatus(settings, periods, "2026-09-20");
    expect(cycleKcal({ lutealKcal: true }, luteal)).toBe(150);
    expect(cycleKcal({}, luteal)).toBe(0);
    expect(cycleKcal({ lutealKcal: true }, cycleStatus(settings, periods, "2026-09-08"))).toBe(0);
  });
});

describe("pill pack and fasts to replace", () => {
  it("counts days of the pack, with the break week", () => {
    const pill = { on: true, packStart: "2026-10-01", active: 21, breakDays: 7, time: "21:00", remind: true };
    expect(pillDay(pill, "2026-10-01")).toMatchObject({ day: 1, active: true });
    expect(pillDay(pill, "2026-10-21")).toMatchObject({ day: 21, active: true });
    expect(pillDay(pill, "2026-10-22")).toMatchObject({ day: 22, active: false, breakDay: 1 });
    expect(pillDay(pill, "2026-10-29")).toMatchObject({ day: 1, active: true });
    expect(pillDay(pill, "2026-09-30")).toBeNull();
    expect(pillDay({ ...pill, active: 28, breakDays: 0 }, "2026-11-15")).toMatchObject({ active: true });
  });
  it("owes missed fasts plus those added, less those replaced", () => {
    const days = [day("a", { fastMissed: true }), day("b", { fastMissed: true }), day("c", { qada: true })];
    expect(qadaOwed(days)).toBe(1);
    expect(qadaOwed(days, 3)).toBe(4);
    expect(qadaOwed(days, -5)).toBe(0);
  });
});

describe("cycle lock", () => {
  it("stores a salted hash, never the digits", async () => {
    const a = await hashPin("1234", "me");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("1234");
    expect(await hashPin("1234", "me")).toBe(a);
    expect(await hashPin("1234", "someone else")).not.toBe(a);
  });
});
