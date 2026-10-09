import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronRight, Flame, Plus, Search } from "lucide-react";
import { CARDIO_GROUPS, EXERCISES, STRENGTH_GROUPS } from "../data/exercises";
import { useExerciseSteps } from "../lib/usda";
import { t, useLanguage } from "../i18n";
import { exLabel, exName, exTip, useExerciseNames } from "../i18n/exercises";
import { kcalFor } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { useStore } from "../lib/store";
import type { Exercise } from "../lib/types";
import { Segmented, Sheet, Stepper, useShowMore } from "./ui";
import { ExerciseHero, ExerciseThumb } from "./ExercisePicture";

export function ExerciseLibrary({
  open,
  onClose,
  onPick,
  pickLabel,
}: {
  open: boolean;
  onClose: () => void;
  onPick?: (ex: Exercise, minutes?: number) => void;
  pickLabel?: string;
}) {
  useLanguage();
  const lang = useExerciseNames();
  const weight = useStore((s) => s.profile.weightKg);
  const [kind, setKind] = useState<"strength" | "cardio">("strength");
  const [group, setGroup] = useState("All");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const howTo = useExerciseSteps(detail?.name, lang);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    if (open) {
      setQ("");
      setDetail(null);
    }
  }, [open]);
  useEffect(() => setGroup("All"), [kind]);

  // Search finds an exercise by its English name and by its name in the app's language.
  const haystack = (e: Exercise) =>
    `${e.name} ${exName(e.name)} ${e.category} ${exLabel(e.category)} ${e.aliases ?? ""} ${e.muscles?.map((m) => `${m} ${exLabel(m)}`).join(" ") ?? ""} ${e.equipment ?? ""} ${exLabel(e.equipment)}`.toLowerCase();
  const groups = ["All", ...(kind === "strength" ? STRENGTH_GROUPS : CARDIO_GROUPS)];
  // Typing stays responsive: the list catches up with the search box a moment later.
  const query = useDeferredValue(q);
  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (term ? true : e.kind === kind) &&
        (term || group === "All" || e.category === group) &&
        (!term || haystack(e).includes(term)),
    );
  }, [kind, group, query, lang]);
  const [shown, more] = useShowMore(list);

  return (
    <>
      <Sheet open={open} onClose={onClose} title={t("Exercises")}>
        <div className="search">
          <Search size={17} />
          <input placeholder={t("Search {n} exercises & sports", { n: EXERCISES.length })} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {!q && (
          <>
            <div style={{ marginTop: 12 }}>
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  { value: "strength", label: t("Strength") },
                  { value: "cardio", label: t("Cardio & Sports") },
                ]}
              />
            </div>
            <div className="chips" style={{ marginTop: 12 }}>
              {groups.map((g) => (
                <button key={g} className={`chip ${g === group ? "active" : ""}`} onClick={() => setGroup(g)}>
                  {g === "All" ? t("All") : exLabel(g)}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="group" style={{ marginTop: 12 }}>
          {shown.map((e) => (
            <button
              className="row"
              key={e.id}
              onClick={() => {
                setMinutes(30);
                setDetail(e);
              }}
            >
              <ExerciseThumb name={e.name} category={e.category} />
              <div className="row-main">
                <div className="row-title">{exName(e.name)}</div>
                <div className="row-sub">
                  {e.kind === "strength" ? `${e.muscles?.map(exLabel).join(", ")} · ${exLabel(e.equipment)}` : `${exLabel(e.category)} · ${round(kcalFor(e.met, weight, 30))} kcal / 30 min`}
                </div>
              </div>
              <ChevronRight size={16} className="chev" />
            </button>
          ))}
          {more}
          {list.length === 0 && <div className="empty">{t("No exercises match.")}</div>}
        </div>
      </Sheet>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={exLabel(detail?.category)}>
        {detail && (
          <>
            <ExerciseHero name={detail.name} category={detail.category} />
            <h2 className="h2" style={{ marginTop: 4 }}>
              {exName(detail.name)}
            </h2>
            <div className="card">
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat-label">{t("Intensity")}</span>
                  <span className="stat-value">
                    {detail.met}
                    <small>MET</small>
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">
                    <Flame size={13} color="var(--orange)" /> {t("Per 10 min")}
                  </span>
                  <span className="stat-value">
                    {round(kcalFor(detail.met, weight, 10))}
                    <small>kcal</small>
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t("Per hour")}</span>
                  <span className="stat-value">
                    {round(kcalFor(detail.met, weight, 60))}
                    <small>kcal</small>
                  </span>
                </div>
              </div>
            </div>
            {detail.kind === "strength" && (
              <div className="group" style={{ marginTop: 12 }}>
                <div className="row">
                  <div className="row-main">{t("Muscles")}</div>
                  <div className="row-value" style={{ whiteSpace: "normal", textAlign: "right" }}>
                    {detail.muscles?.map(exLabel).join(", ")}
                  </div>
                </div>
                <div className="row">
                  <div className="row-main">{t("Equipment")}</div>
                  <div className="row-value">{exLabel(detail.equipment)}</div>
                </div>
                {detail.tip && !howTo.length && (
                  <div className="row">
                    <div className="row-main" style={{ fontSize: 15 }}>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 2 }}>
                        {t("Form cue")}
                      </div>
                      {exTip(detail.tip)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {howTo.length > 0 && (
              <>
                <div className="section-header">{t("How to do it")}</div>
                <ol className="card how-to" data-testid="how-to">
                  {howTo.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </>
            )}
            {detail.kind === "cardio" && onPick && (
              <div className="group" style={{ marginTop: 12 }}>
                <div className="row">
                  <div className="row-main">
                    {t("Duration")}
                    <div className="row-sub">≈ {round(kcalFor(detail.met, weight, minutes))} kcal</div>
                  </div>
                  <Stepper value={minutes} step={5} min={5} max={600} onChange={setMinutes} format={(v) => `${v} min`} />
                </div>
              </div>
            )}
            <p className="footnote">{t("Calories = MET × your weight ({kg} kg) × hours, using the Compendium of Physical Activities.", { kg: weight })}</p>
            {onPick && (
              <>
                <div className="spacer" />
                <button
                  className="btn"
                  onClick={() => {
                    onPick(detail, detail.kind === "cardio" ? minutes : undefined);
                    setDetail(null);
                    onClose();
                  }}
                >
                  <Plus size={18} /> {pickLabel ?? t("Add to workout")}
                </button>
              </>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
