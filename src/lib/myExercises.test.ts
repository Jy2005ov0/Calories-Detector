import { describe, expect, it } from "vitest";
import { EXERCISE_BY_NAME, myExercises } from "../data/exercises";
import { exerciseByName, groupOf, poolFor } from "../data/exercisePools";
import { exerciseOf } from "../components/MyExercise";
import { buildPlan, planFor } from "./fitness";
import { actions, getState, setState } from "./store";

const draft = { name: "  Landmine   row ", kind: "strength" as const, target: "back" as const, equipment: "Barbell", effort: "moderate" as const, note: "" };

describe("your own exercises", () => {
  it("are found, planned and swapped like library exercises, and renames carry over", () => {
    const ex = exerciseOf(draft, "my-test");
    expect(ex).toMatchObject({ name: "Landmine row", kind: "strength", category: "Back", muscles: ["Lats"], met: 5 });
    actions.saveCustomExercise(ex);
    expect(myExercises()).toHaveLength(1);
    expect(exerciseByName("Landmine row")).toBe(ex);
    expect(groupOf("Landmine row")).toBe("back");
    // Offered first when swapping, but never chosen over a staple by the plan itself.
    expect(poolFor("back")[0].name).toBe("Landmine row");
    const plain = buildPlan({ goal: "gain", experience: "intermediate", trainingDays: 4 }, "auto", {});
    expect(plain.days.flatMap((d) => d.exercises.map((e) => e.name))).not.toContain("Landmine row");

    // Swap it into the plan and log a workout with it.
    const key = planFor(getState()).days[0].exercises[0].swapKey!;
    actions.swapExercise(key, "Landmine row");
    expect(planFor(getState()).days[0].exercises[0].name).toBe("Landmine row");
    setState({
      sessions: [{ id: "w1", date: "2026-10-13", title: "Back", startedAt: 0, endedAt: 1, kcal: 100, exercises: [{ id: "s1", exerciseId: "my-test", name: "Landmine row", kind: "strength", met: 5, sets: [] }] }],
    });

    // Rename: the plan and past workouts follow; the old name is free again.
    actions.saveCustomExercise({ ...ex, name: "Garage bar row" });
    expect(EXERCISE_BY_NAME.has("Landmine row")).toBe(false);
    expect(planFor(getState()).days[0].exercises[0].name).toBe("Garage bar row");
    expect(getState().sessions[0].exercises[0].name).toBe("Garage bar row");

    // Delete: the plan goes back to its suggestion, logged workouts stay.
    actions.deleteCustomExercise("my-test");
    expect(exerciseByName("Garage bar row")).toBeUndefined();
    expect(planFor(getState()).days[0].exercises[0].name).not.toBe("Garage bar row");
    expect(getState().sessions[0].exercises[0].name).toBe("Garage bar row");
  });

  it("never takes over a library exercise's name", () => {
    const fake = exerciseOf({ ...draft, name: "Pull-up", target: "chest" }, "my-fake");
    const real = EXERCISE_BY_NAME.get("Pull-up");
    actions.saveCustomExercise(fake);
    expect(EXERCISE_BY_NAME.get("Pull-up")).toBe(real);
    expect(groupOf("Pull-up")).toBe("back");
    actions.deleteCustomExercise("my-fake");
    expect(EXERCISE_BY_NAME.get("Pull-up")).toBe(real);
  });

  it("works out cardio calories from how hard it is", () => {
    expect(exerciseOf({ ...draft, kind: "cardio", effort: "easy" }, "my-c").met).toBe(4);
    expect(exerciseOf({ ...draft, kind: "cardio", effort: "hard" }, "my-c").met).toBe(10);
    expect(exerciseOf({ ...draft, equipment: "Bodyweight", target: "biceps" }, "my-b").met).toBe(3.8);
  });
});
