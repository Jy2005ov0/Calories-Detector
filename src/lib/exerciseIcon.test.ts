import { describe, expect, it } from "vitest";
import { EXERCISES } from "../data/exercises";
import { PICTOGRAMS } from "../components/pictograms";
import { exerciseIconKey } from "./exerciseIcon";

const key = (name: string) => {
  const e = EXERCISES.find((x) => x.name === name);
  if (!e) throw new Error(name);
  return exerciseIconKey(e);
};

describe("exercise icons", () => {
  it("draws the movement for gym exercises", () => {
    expect(key("Barbell bench press")).toBe("bench");
    expect(key("Back squat")).toBe("squat");
    expect(key("Barbell row")).toBe("row");
    expect(key("Pull-up")).toBe("pullup");
    expect(key("Barbell curl")).toBe("curl");
    expect(key("Wrist curl")).toBe("wrist");
    expect(key("Plank")).toBe("plank");
    expect(key("Snatch-grip deadlift")).toBe("deadlift");
    expect(key("Narrow Stance Leg Press")).toBe("legPress");
    expect(key("Box squat")).toBe("squat");
    expect(key("Decline dumbbell fly")).toBe("fly");
    // Stretches named only after the muscle.
    expect(key("90/90 Hamstring")).toBe("stretch");
  });

  it("shows the sport for activities", () => {
    expect(key("Badminton, singles")).toBe("badminton");
    expect(key("Futsal")).toBe("soccer");
    expect(key("Sepak takraw")).toBe("takraw");
    expect(key("Swimming, breaststroke")).toBe("swim");
    expect(key("Boxing, heavy bag")).toBe("punchingBag");
    expect(key("Yoga, Hatha")).toBe("yoga");
    expect(key("Walking the dog")).toBe("dog");
    expect(key("Assault bike, sprint intervals (Tabata)")).toBe("spinBike");
  });

  it("gives every exercise an icon, and spreads them out", () => {
    const counts = new Map<string, number>();
    for (const e of EXERCISES) {
      const k = exerciseIconKey(e);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(counts.size).toBeGreaterThan(120);
    // No single icon stands for more than 6% of the library.
    expect(Math.max(...counts.values())).toBeLessThan(EXERCISES.length * 0.06);
    // Every gym-movement key used has a drawing.
    for (const e of EXERCISES.filter((x) => x.kind === "strength")) {
      const k = exerciseIconKey(e);
      if (!(k in PICTOGRAMS)) expect(["sprint", "run"], `${e.name} → ${k}`).toContain(k);
    }
  });
});
