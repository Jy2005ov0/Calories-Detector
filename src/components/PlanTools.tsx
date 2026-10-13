import { useMemo, useState } from "react";
import { Plus, RotateCcw, Search } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { exLabel, exName, useExerciseNames } from "../i18n/exercises";
import { isMine } from "../data/exercises";
import { MUSCLE_GROUPS, allowed, exerciseByName, poolFor, type Equipment, type MuscleGroup } from "../data/exercisePools";
import { WEEKDAYS, customTitle, defaultCustomDays, type CustomDay, type PlannedExercise, type TrainingPlan } from "../lib/fitness";
import { actions, useStore } from "../lib/store";
import { ExerciseThumb } from "./ExercisePicture";
import { MyExerciseSheet } from "./MyExercise";
import { Segmented, Sheet, haptic } from "./ui";

/** Where the person trains: the plan only uses exercises they can do there. */
export function EquipmentPicker() {
  useLanguage();
  const equipment = useStore((s) => s.profile.equipment) ?? "gym";
  return (
    <>
      <div className="section-header">{t("Where you train")}</div>
      <Segmented<Equipment>
        ariaLabel={t("Where you train")}
        value={equipment}
        onChange={(v) => actions.updateProfile({ equipment: v })}
        options={[
          { value: "gym", label: t("Gym") },
          { value: "dumbbells", label: t("Dumbbells") },
          { value: "home", label: t("Home"), ariaLabel: t("Home, no weights") },
        ]}
      />
    </>
  );
}

/** "My own split": tap the muscle groups for each training day. */
export function CustomSplitEditor({ plan }: { plan: TrainingPlan }) {
  useLanguage();
  const days = useStore((s) => s.profile.trainingDays);
  const saved = useStore((s) => s.customSplit) as CustomDay[];
  const current: CustomDay[] = Array.from({ length: Math.min(6, Math.max(2, days)) }, (_, i) => saved[i] ?? defaultCustomDays(6)[i] ?? []);
  const toggle = (day: number, g: MuscleGroup) => {
    const next = current.map((d, i) => (i === day ? (d.includes(g) ? d.filter((x) => x !== g) : [...d, g]) : d));
    actions.setCustomSplit(next);
    haptic();
  };
  return (
    <div data-testid="custom-split">
      {current.map((groups, i) => (
        <div className="card" key={i} style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            {t(WEEKDAYS[plan.days[i]?.weekday ?? i]).toUpperCase()}
          </div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{customTitle(groups)}</div>
          <div className="chip-wrap" role="group" aria-label={t("Muscle groups for day {n}", { n: i + 1 })}>
            {MUSCLE_GROUPS.map((g) => (
              <button key={g.id} className={`chip${groups.includes(g.id) ? " active" : ""}`} aria-pressed={groups.includes(g.id)} onClick={() => toggle(i, g.id)}>
                {t(g.label)}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="footnote">{t("Each day gets 5–6 exercises from the groups you pick, big muscles first. Swap any exercise in the plan below.")}</p>
    </div>
  );
}

/** Choose another exercise for the same muscles. */
export function SwapSheet({ exercise, onClose }: { exercise: PlannedExercise | null; onClose: () => void }) {
  useLanguage();
  useExerciseNames();
  const equipment = useStore((s) => s.profile.equipment) ?? "gym";
  const swaps = useStore((s) => s.planSwaps);
  const mine = useStore((s) => s.customExercises);
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const group = exercise?.group;
  const list = useMemo(() => {
    if (!group) return [];
    const needle = q.trim().toLowerCase();
    return poolFor(group).filter((e) => {
      const ex = exerciseByName(e.name);
      if (!ex || (!all && !allowed(equipment, ex))) return false;
      return !needle || e.name.toLowerCase().includes(needle) || exName(e.name).toLowerCase().includes(needle);
    });
  }, [group, q, all, equipment, mine]);
  const shown = list.slice(0, 80);
  const swapped = !!(exercise?.swapKey && swaps[exercise.swapKey]);
  const pick = (name: string) => {
    if (!exercise?.swapKey) return;
    actions.swapExercise(exercise.swapKey, name);
    haptic("success");
    setQ("");
    onClose();
  };
  const groupLabel = MUSCLE_GROUPS.find((g) => g.id === group)?.label ?? "";
  return (
    <Sheet open={!!exercise} onClose={onClose} title={t("Swap exercise")}>
      {exercise && (
        <>
          <p className="footnote" style={{ marginTop: 0 }}>
            {t("Other {group} exercises you can do {where}.", {
              group: t(groupLabel).toLowerCase(),
              where: equipment === "gym" ? t("at the gym") : equipment === "dumbbells" ? t("with dumbbells") : t("at home without weights"),
            })}
          </p>
          <div className="search" style={{ marginBottom: 10 }}>
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search exercises")} aria-label={t("Search exercises")} />
          </div>
          {swapped && (
            <button
              className="btn secondary"
              style={{ width: "100%", marginBottom: 10 }}
              onClick={() => {
                actions.swapExercise(exercise.swapKey!, null);
                onClose();
              }}
            >
              <RotateCcw size={16} /> {t("Back to the suggested exercise")}
            </button>
          )}
          <div className="group" data-testid="swap-list">
            {shown.map((e) => (
              <button key={e.name} className="row" onClick={() => pick(e.name)} aria-current={e.name === exercise.name}>
                <ExerciseThumb name={e.name} size={40} />
                <div className="row-main">
                  <div className="row-title">{exName(e.name)}</div>
                  <div className="row-sub">
                    {isMine(exerciseByName(e.name)) && <span className="mine-tag">{t("Mine")} · </span>}
                    {exLabel(exerciseByName(e.name)?.equipment)}
                  </div>
                </div>
                {e.name === exercise.name && (
                  <span className="check-mark" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            ))}
            {!shown.length && <div className="row muted">{t("No exercises match.")}</div>}
          </div>
          <button className="link" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>
            <Plus size={16} /> {t("Create your own exercise")}
          </button>
          {list.length > shown.length && <p className="footnote">{t("Showing {n} of {total}. Search to find more.", { n: shown.length, total: list.length })}</p>}
          {equipment !== "gym" && (
            <button className="link" style={{ marginTop: 10 }} onClick={() => setAll((v) => !v)}>
              {all ? t("Only exercises I can do here") : t("Show gym exercises too")}
            </button>
          )}
        </>
      )}
      <MyExerciseSheet open={creating} initialName={q} initialGroup={group} onClose={() => setCreating(false)} onSaved={(ex) => pick(ex.name)} />
    </Sheet>
  );
}
