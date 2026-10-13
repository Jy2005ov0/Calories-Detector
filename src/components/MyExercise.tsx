import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { exLabel } from "../i18n/exercises";
import { EXERCISE_BY_NAME } from "../data/exercises";
import { MUSCLE_GROUPS, type MuscleGroup } from "../data/exercisePools";
import { kcalFor } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { actions, uid, useStore } from "../lib/store";
import type { Exercise } from "../lib/types";
import { Segmented, Sheet, haptic } from "./ui";

type Target = MuscleGroup | "full";

/** The library's main muscle and category for each group, so a new exercise is found and planned like the rest. */
const TARGET: Record<Target, { muscle: string; category: string; big: boolean }> = {
  chest: { muscle: "Chest", category: "Chest", big: true },
  back: { muscle: "Lats", category: "Back", big: true },
  shoulders: { muscle: "Shoulders", category: "Shoulders", big: false },
  biceps: { muscle: "Biceps", category: "Arms", big: false },
  triceps: { muscle: "Triceps", category: "Arms", big: false },
  quads: { muscle: "Quadriceps", category: "Legs", big: true },
  hamstrings: { muscle: "Hamstrings", category: "Legs", big: true },
  glutes: { muscle: "Glutes", category: "Legs", big: true },
  calves: { muscle: "Calves", category: "Legs", big: false },
  core: { muscle: "Abdominals", category: "Core", big: false },
  forearms: { muscle: "Forearms", category: "Arms", big: false },
  full: { muscle: "Full body", category: "Full Body", big: true },
};

export const MY_EQUIPMENT = ["Barbell", "Dumbbell", "Machine", "Cable", "Kettlebell", "Bodyweight", "Resistance band", "Equipment"] as const;

/** Cardio effort → MET (Compendium: light ≈ 4, moderate ≈ 7, vigorous ≈ 10). */
const EFFORT = { easy: 4, moderate: 7, hard: 10 } as const;
type Effort = keyof typeof EFFORT;

interface Draft {
  name: string;
  kind: "strength" | "cardio";
  target: Target;
  equipment: string;
  effort: Effort;
  note: string;
}

const blank = (name = ""): Draft => ({ name, kind: "strength", target: "chest", equipment: "Dumbbell", effort: "moderate", note: "" });

function draftOf(e: Exercise): Draft {
  const target = (Object.keys(TARGET) as Target[]).find((k) => TARGET[k].muscle === e.muscles?.[0]) ?? "full";
  const effort = (Object.keys(EFFORT) as Effort[]).reduce((a, b) => (Math.abs(EFFORT[b] - e.met) < Math.abs(EFFORT[a] - e.met) ? b : a));
  return { name: e.name, kind: e.kind, target, equipment: e.equipment ?? "Equipment", effort, note: e.tip ?? "" };
}

/** Build the exercise from the form. Weights burn a little more on big muscles, like the library's own lifts. */
export function exerciseOf(d: Draft, id: string): Exercise {
  const name = d.name.trim().replace(/\s+/g, " ");
  const tip = d.note.trim() || undefined;
  if (d.kind === "cardio") return { id, name, kind: "cardio", category: "Mine", met: EFFORT[d.effort], tip };
  const tg = TARGET[d.target];
  const met = d.equipment === "Bodyweight" ? 3.8 : tg.big ? 5 : 3.5;
  return { id, name, kind: "strength", category: tg.category, met, muscles: [tg.muscle], equipment: d.equipment, tip };
}

/** Create or edit one of your own exercises. */
export function MyExerciseSheet({
  open,
  editing,
  initialName,
  initialGroup,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: Exercise | null;
  initialName?: string;
  /** Start a new exercise on this muscle group (when made from the plan's swap list). */
  initialGroup?: MuscleGroup;
  onClose: () => void;
  onSaved?: (ex: Exercise) => void;
}) {
  useLanguage();
  const weight = useStore((s) => s.profile.weightKg);
  const [d, setD] = useState<Draft>(blank());
  useEffect(() => {
    if (open) setD(editing ? draftOf(editing) : { ...blank(initialName?.trim() ?? ""), target: initialGroup ?? "chest" });
  }, [open, editing, initialName, initialGroup]);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const name = d.name.trim().replace(/\s+/g, " ");
  const clash = EXERCISE_BY_NAME.get(name);
  const taken = !!clash && clash.id !== editing?.id;
  const preview = exerciseOf(d, editing?.id ?? "my-new");

  const save = () => {
    if (!name || taken) return;
    const ex = exerciseOf(d, editing?.id ?? `my-${uid()}`);
    actions.saveCustomExercise(ex);
    haptic("success");
    onSaved?.(ex);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={editing ? t("Edit exercise") : t("New exercise")}>
      <div className="group">
        <div className="field">
          <label htmlFor="my-ex-name">{t("Name")}</label>
          <input id="my-ex-name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("e.g. Landmine press")} maxLength={60} autoComplete="off" />
        </div>
      </div>
      {taken && (
        <p className="footnote" role="alert" style={{ color: "var(--red)" }}>
          {t("“{name}” is already in the library. Search for it, or pick another name.", { name })}
        </p>
      )}

      <div className="section-header">{t("Type")}</div>
      <Segmented
        ariaLabel={t("Type")}
        value={d.kind}
        onChange={(kind) => set({ kind })}
        options={[
          { value: "strength", label: t("Strength") },
          { value: "cardio", label: t("Cardio & Sports") },
        ]}
      />

      {d.kind === "strength" ? (
        <>
          <div className="section-header">{t("Main muscle")}</div>
          <div className="chip-wrap" role="group" aria-label={t("Main muscle")}>
            {[...MUSCLE_GROUPS, { id: "full" as const, label: "Full body" }].map((g) => (
              <button key={g.id} className={`chip${d.target === g.id ? " active" : ""}`} aria-pressed={d.target === g.id} onClick={() => set({ target: g.id })}>
                {t(g.label)}
              </button>
            ))}
          </div>
          <div className="section-header">{t("Equipment")}</div>
          <div className="chip-wrap" role="group" aria-label={t("Equipment")}>
            {MY_EQUIPMENT.map((q) => (
              <button key={q} className={`chip${d.equipment === q ? " active" : ""}`} aria-pressed={d.equipment === q} onClick={() => set({ equipment: q })}>
                {q === "Equipment" ? t("Other") : exLabel(q)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="section-header">{t("How hard is it?")}</div>
          <Segmented
            ariaLabel={t("How hard is it?")}
            value={d.effort}
            onChange={(effort) => set({ effort })}
            options={[
              { value: "easy", label: t("Easy") },
              { value: "moderate", label: t("Moderate") },
              { value: "hard", label: t("Hard") },
            ]}
          />
        </>
      )}
      <p className="footnote">
        {t("About {kcal} kcal per 30 min for you, worked out like similar exercises.", { kcal: round(kcalFor(preview.met, weight, 30)) })}
      </p>

      <div className="group" style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="my-ex-note">{t("Note")}</label>
          <input id="my-ex-note" value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder={t("Optional, e.g. a form cue")} maxLength={120} autoComplete="off" />
        </div>
      </div>

      <div className="spacer" />
      <button className="btn" disabled={!name || taken} onClick={save}>
        <Check size={18} /> {editing ? t("Save") : t("Create exercise")}
      </button>
    </Sheet>
  );
}
