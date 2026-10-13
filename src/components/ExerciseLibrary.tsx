import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Flame, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { CARDIO_GROUPS, EXERCISES, STRENGTH_GROUPS, isMine } from "../data/exercises";
import { useExerciseSteps } from "../lib/usda";
import { t, useLanguage } from "../i18n";
import { exLabel, exName, exTip, useExerciseNames } from "../i18n/exercises";
import { kcalFor } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { confirmDialog } from "../lib/platform";
import { actions, useStore } from "../lib/store";
import type { Exercise } from "../lib/types";
import { Segmented, Sheet, Stepper, useShowMore } from "./ui";
import { ExerciseHero, ExerciseThumb } from "./ExercisePicture";
import { MyExerciseSheet } from "./MyExercise";

const MINE = "__mine";

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
  const mine = useStore((s) => s.customExercises);
  const [editor, setEditor] = useState<{ editing: Exercise | null; name: string } | null>(null);
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
    return [...mine, ...EXERCISES].filter(
      (e) =>
        (term ? true : e.kind === kind) &&
        (term || group === "All" || (group === MINE ? isMine(e) : e.category === group)) &&
        (!term || haystack(e).includes(term)),
    );
  }, [kind, group, query, lang, mine]);
  const typed = q.trim().replace(/\s+/g, " ");
  const exact = list.some((e) => e.name.toLowerCase() === typed.toLowerCase() || exName(e.name).toLowerCase() === typed.toLowerCase());
  const create = (name = "") => setEditor({ editing: null, name });
  const remove = async (e: Exercise) => {
    if (!(await confirmDialog(t("Delete {name}?", { name: e.name }), t("Workouts you already logged with it stay as they are.")))) return;
    actions.deleteCustomExercise(e.id);
    setDetail(null);
  };
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
              {[groups[0], MINE, ...groups.slice(1)].map((g) => (
                <button key={g} className={`chip ${g === group ? "active" : ""}`} onClick={() => setGroup(g)}>
                  {g === "All" ? t("All") : g === MINE ? t("My exercises") : exLabel(g)}
                </button>
              ))}
            </div>
          </>
        )}
        {!q && group !== MINE && (
          <button className="link tap-link" onClick={() => create()}>
            <Plus size={16} /> {t("Create your own exercise")}
          </button>
        )}
        <div className="group" style={{ marginTop: 12 }}>
          {((typed && !exact) || group === MINE) && (
            <button className="row" onClick={() => create(typed)} data-testid="create-exercise">
              <div className="icon-tile" style={{ background: "var(--blue)" }}>
                <Plus size={18} />
              </div>
              <div className="row-main">
                <div className="row-title wrap">{typed ? t("Create “{name}”", { name: typed }) : t("Create your own exercise")}</div>
                <div className="row-sub wrap">{t("Not in the list? Add it and track it like any other.")}</div>
              </div>
              <ChevronRight size={16} className="chev" />
            </button>
          )}
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
                  {isMine(e) && (
                    <span className="mine-tag">
                      <UserRound size={12} aria-hidden /> {t("Mine")} ·{" "}
                    </span>
                  )}
                  {e.kind === "cardio" && isMine(e) ? `${round(kcalFor(e.met, weight, 30))} kcal / 30 min` : e.kind === "strength" ? `${e.muscles?.map(exLabel).join(lang === "zh" ? "、" : ", ")} · ${exLabel(e.equipment)}` : `${exLabel(e.category)} · ${round(kcalFor(e.met, weight, 30))} kcal / 30 min`}
                </div>
              </div>
              <ChevronRight size={16} className="chev" />
            </button>
          ))}
          {more}
          {list.length === 0 && <div className="empty">{group === MINE && !q ? t("Exercises you create show up here.") : t("No exercises match.")}</div>}
        </div>
      </Sheet>

      <ExerciseDetailSheet
        exercise={detail}
        onClose={() => setDetail(null)}
        extra={(detail) => (
          <>
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
            {isMine(detail) && (
              <div className="row-buttons" style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn secondary small" style={{ flex: 1 }} onClick={() => setEditor({ editing: detail, name: detail.name })}>
                  <Pencil size={15} /> {t("Edit")}
                </button>
                <button className="btn secondary small" style={{ flex: 1, color: "var(--red)" }} onClick={() => remove(detail)}>
                  <Trash2 size={15} /> {t("Delete")}
                </button>
              </div>
            )}
          </>
        )}
        actions={(detail) =>
          onPick && (
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
          )
        }
      />

      <MyExerciseSheet
        open={!!editor}
        editing={editor?.editing}
        initialName={editor?.name}
        onClose={() => setEditor(null)}
        onSaved={(ex) => {
          setQ("");
          setKind(ex.kind);
          setDetail(ex);
        }}
      />
    </>
  );
}

/** An exercise's own page: pictures, calories, muscles, form cue and step-by-step guide. */
export function ExerciseDetailSheet({
  exercise: detail,
  onClose,
  extra,
  actions,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  /** More rows under the guide (duration, edit and delete…). */
  extra?: (ex: Exercise) => ReactNode;
  /** Buttons at the bottom. */
  actions?: (ex: Exercise) => ReactNode;
}) {
  useLanguage();
  const lang = useExerciseNames();
  const weight = useStore((s) => s.profile.weightKg);
  // Your own exercises have no photos or step-by-step guide to look up.
  const howTo = useExerciseSteps(isMine(detail ?? undefined) ? undefined : detail?.name, lang);
  return (
  <Sheet open={!!detail} onClose={onClose} title={isMine(detail ?? undefined) ? t("Your exercise") : exLabel(detail?.category)} full>
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
                <div className="row-main" style={{ flex: "none" }}>
                  {t("Muscles")}
                </div>
                <div className="row-value" style={{ whiteSpace: "normal", textAlign: "right", flex: 1, minWidth: 0 }}>
                  {detail.muscles?.map(exLabel).join(lang === "zh" ? "、" : ", ")}
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
                      {isMine(detail) ? t("Note") : t("Form cue")}
                    </div>
                    {isMine(detail) ? detail.tip : exTip(detail.tip)}
                  </div>
                </div>
              )}
            </div>
          )}
          {detail.kind === "cardio" && isMine(detail) && detail.tip && (
            <div className="group" style={{ marginTop: 12 }}>
              <div className="row">
                <div className="row-main" style={{ fontSize: 15 }}>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 2 }}>
                    {t("Note")}
                  </div>
                  {detail.tip}
                </div>
              </div>
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
          {extra?.(detail)}
          <p className="footnote">{t("Calories = MET × your weight ({kg} kg) × hours, using the Compendium of Physical Activities.", { kg: weight })}</p>
          {actions?.(detail)}
        </>
      )}
    </Sheet>
  );
}
