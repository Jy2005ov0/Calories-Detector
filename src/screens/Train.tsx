import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Dumbbell, Flame, History, LogIn, LogOut, Plus, Share, Timer, Trash2, Trophy, Weight } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { workoutCard } from "../lib/export";
import { scheduleRestEnd, shareFile } from "../lib/native";
import { isNewRecord, lastPerformance, personalRecords, suggestNext } from "../lib/records";
import { ExerciseLibrary } from "../components/ExerciseLibrary";
import { Empty, NumberInput, SPRING, Sheet, Stepper, haptic, showToast, useNow } from "../components/ui";
import { buildPlan, exerciseKcal, formatDuration, kcalFor, plural, sessionFromPlan, sessionKcal, sessionMinutes, sessionVolume } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { confirmDialog } from "../lib/platform";
import { actions, getState, todayKey, uid, useStore, useTodayKey, weekdayOf } from "../lib/store";
import type { Exercise, SessionExercise, WorkoutSession } from "../lib/types";

function toSessionExercise(ex: Exercise, minutes?: number): SessionExercise {
  return {
    id: uid(),
    exerciseId: ex.id,
    name: ex.name,
    kind: ex.kind,
    met: ex.met,
    minutes: ex.kind === "cardio" ? (minutes ?? 30) : undefined,
    sets: ex.kind === "strength" ? [0, 1, 2].map(() => ({ reps: 10, weightKg: 0, done: false })) : undefined,
  };
}

/** Share a finished workout as an image card. */
async function shareWorkout(w: WorkoutSession) {
  try {
    const dark = document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    const blob = await workoutCard(w, dark);
    await shareFile(`workout-${w.date}.png`, blob, w.title);
  } catch (e) {
    if ((e as Error).name !== "AbortError") showToast(t("Couldn't share: {msg}", { msg: (e as Error).message }));
  }
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

let lastRest: { endsAt: number; total: number } | null = null;

/** Countdown between sets. Buzzes when it's over (also from the lock screen and watch in the apps). */
function RestBar({ rest, onChange }: { rest: { endsAt: number; total: number }; onChange: (r: { endsAt: number; total: number } | null) => void }) {
  const now = useNow(250);
  const left = Math.ceil((rest.endsAt - now) / 1000);
  useEffect(() => {
    if (left <= 0) {
      haptic("success");
      showToast(t("Rest over — time for your next set"));
      onChange(null);
    }
  }, [left, onChange]);
  return (
    <motion.div className="rest-bar" role="timer" aria-live="off" aria-label={t("Rest timer")} initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={SPRING}>
      <Timer size={18} />
      <div className="row-main">
        <div className="tabular" style={{ fontWeight: 700, fontSize: 20 }}>
          {mmss(Math.max(0, left))}
        </div>
        <div className="rest-track">
          <div style={{ transform: `scaleX(${Math.max(0, Math.min(1, left / rest.total))})` }} />
        </div>
      </div>
      <button className="btn small secondary" onClick={() => onChange({ endsAt: rest.endsAt + 15000, total: rest.total + 15 })}>
        +15s
      </button>
      <button className="btn small" onClick={() => onChange(null)}>
        {t("Skip")}
      </button>
    </motion.div>
  );
}

export function Train() {
  const lang = useLanguage();
  const profile = useStore((s) => s.profile);
  const sessions = useStore((s) => s.sessions);
  const activeId = useStore((s) => s.activeSessionId);
  const split = useStore((s) => s.split);
  const active = sessions.find((s) => s.id === activeId) ?? null;
  const now = useNow(1000, !!active);
  const [library, setLibrary] = useState<"add" | "log" | "browse" | null>(null);
  const [finishing, setFinishing] = useState(false);
  // Kept outside the screen so the countdown survives switching tabs.
  const [rest, setRestState] = useState(() => (lastRest && lastRest.endsAt > Date.now() ? lastRest : null));
  const [justFinished, setJustFinished] = useState<WorkoutSession | null>(null);
  const setRest = useMemo(
    () => (r: { endsAt: number; total: number } | null) => {
      setRestState(r);
      lastRest = r;
      scheduleRestEnd(r?.endsAt ?? null);
    },
    [],
  );
  const records = useMemo(() => personalRecords(sessions), [sessions]);

  // `lang` is a dependency so plan text is rebuilt in the new language.
  const plan = useMemo(() => buildPlan(profile, split), [profile, split, lang]);
  const weekday = weekdayOf(useTodayKey());
  const todaysPlan = plan.days.find((d) => d.weekday === weekday);
  const history = sessions.filter((s) => s.endedAt);
  const weekAgo = Date.now() - 7 * 86400000;
  const week = history.filter((s) => s.startedAt >= weekAgo);

  const clockIn = (title: string, exercises: SessionExercise[] = []) => {
    actions.clockIn(title, exercises);
    haptic("success");
    showToast(t("Clocked in at {time}", { time: new Date().toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" }) }));
  };

  const update = (fn: (s: WorkoutSession) => WorkoutSession) => active && actions.updateSession(active.id, fn);
  const updateEx = (exId: string, fn: (e: SessionExercise) => SessionExercise) =>
    update((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));

  const onPick = (ex: Exercise, minutes?: number) => {
    if (library === "log") {
      // Log an activity done earlier without clocking in.
      const end = Date.now();
      const m = minutes ?? 30;
      const session: WorkoutSession = {
        id: uid(),
        date: todayKey(),
        title: ex.name,
        startedAt: end - m * 60000,
        endedAt: end,
        exercises: [toSessionExercise(ex, m)],
        kcal: Math.round(kcalFor(ex.met, profile.weightKg, m)),
      };
      actions.addSession(session);
      showToast(t("Logged {name} · {kcal} kcal", { name: ex.name, kcal: session.kcal }));
      return;
    }
    if (!active) {
      clockIn(ex.kind === "cardio" ? ex.name : t("Workout"), [toSessionExercise(ex, minutes)]);
      return;
    }
    update((s) => ({ ...s, exercises: [...s.exercises, toSessionExercise(ex, minutes)] }));
  };

  if (active) {
    const minutes = sessionMinutes(active, now);
    const kcal = sessionKcal(active, profile.weightKg, now);
    const doneSets = active.exercises.reduce((a, e) => a + (e.sets ?? []).filter((x) => x.done).length, 0);
    return (
      <div className={`screen ${rest ? "resting" : ""}`}>
        <div className="title-row" style={{ marginTop: 14 }}>
          <h1 className="large-title">{active.title}</h1>
          <span className="badge" style={{ background: "var(--green-fill)", color: "#fff", marginBottom: 8 }}>
            <span className="pulse" style={{ width: 7, height: 7 }} /> {t("LIVE")}
          </span>
        </div>
        <p className="subtitle">{t("Clocked in at {time}", { time: new Date(active.startedAt).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" }) })}</p>

        <div className="card">
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">
                <Clock size={13} /> {t("Time")}
              </span>
              <span className="stat-value tabular">{formatDuration(minutes)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">
                <Flame size={13} color="var(--orange)" /> {t("Burned")}
              </span>
              <span className="stat-value">
                {round(kcal)}
                <small>kcal</small>
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">
                <Weight size={13} /> {t("Volume")}
              </span>
              <span className="stat-value">
                {round(sessionVolume(active))}
                <small>kg</small>
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {active.exercises.map((ex) => (
            <motion.div
              key={ex.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={SPRING}
              className="card"
              style={{ marginTop: 12 }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div className="row-main">
                  <div style={{ fontWeight: 600 }}>{ex.name}</div>
                  <div className="row-sub">
                    {ex.targetReps ? `${t("Target")} ${ex.sets?.length} × ${ex.targetReps} · ` : ""}
                    {round(exerciseKcal(ex, profile.weightKg))} kcal
                  </div>
                  {ex.kind === "strength" && <LiftHistory exerciseId={ex.exerciseId} targetReps={ex.targetReps} sessionId={active.id} />}
                </div>
                <button
                  className="icon-btn"
                  aria-label={t("Remove {name}", { name: ex.name })}
                  onClick={() => update((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== ex.id) }))}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {ex.kind === "cardio" ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted">{t("Duration")}</span>
                  <Stepper value={ex.minutes ?? 0} step={5} min={0} max={600} format={(v) => `${v} min`} onChange={(v) => updateEx(ex.id, (e) => ({ ...e, minutes: v }))} />
                </div>
              ) : (
                <>
                  <div className="set-grid">
                    <span className="head">{t("Set")}</span>
                    <span className="head">kg</span>
                    <span className="head">{t("Reps")}</span>
                    <span />
                    {(ex.sets ?? []).map((set, i) => (
                      <SetRow
                        key={i}
                        index={i}
                        set={set}
                        onChange={(next) => {
                          // Check for a record against what was done before this set is saved.
                          const record = next.done && !set.done && isNewRecord(getState().sessions, ex.exerciseId, next, active.id);
                          updateEx(ex.id, (e) => ({ ...e, sets: e.sets!.map((s, j) => (j === i ? next : s)) }));
                          if (next.done && !set.done) {
                            if (record) {
                              haptic("success");
                              showToast(t("New personal record · {name} {kg} kg × {reps}", { name: ex.name, kg: next.weightKg, reps: next.reps }));
                            }
                            const secs = ex.restSec ?? 90;
                            setRest({ endsAt: Date.now() + secs * 1000, total: secs });
                          }
                        }}
                      />
                    ))}
                  </div>
                  <button
                    className="btn small secondary"
                    style={{ marginTop: 10 }}
                    onClick={() =>
                      updateEx(ex.id, (e) => {
                        const last = e.sets?.[e.sets.length - 1];
                        return { ...e, sets: [...(e.sets ?? []), { reps: last?.reps ?? 10, weightKg: last?.weightKg ?? 0, done: false }] };
                      })
                    }
                  >
                    <Plus size={15} /> {t("Add set")}
                  </button>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {active.exercises.length === 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <Empty icon={<Dumbbell size={28} />}>
              {t("Add the exercises you do for a more accurate calorie count. Until then time is counted as general gym training.")}
            </Empty>
          </div>
        )}

        <div className="spacer" />
        <button className="btn tinted" onClick={() => setLibrary("add")}>
          <Plus size={18} /> {t("Add exercise")}
        </button>
        <div className="spacer" />
        <button className="btn red" data-tour="clock-out" onClick={() => setFinishing(true)}>
          <LogOut size={18} /> {t("Clock out")}
        </button>

        <Sheet open={finishing} onClose={() => setFinishing(false)} title={t("Clock out")}>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="muted">{active.title}</div>
            <div className="big-number" style={{ margin: "8px 0" }}>
              {round(kcal)}
            </div>
            <div className="muted">{t("kcal burned")}</div>
            <div className="spacer" />
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-label" style={{ justifyContent: "center" }}>
                  {t("Time")}
                </span>
                <span className="stat-value tabular">{formatDuration(minutes)}</span>
              </div>
              <div className="stat">
                <span className="stat-label" style={{ justifyContent: "center" }}>
                  {t("Sets")}
                </span>
                <span className="stat-value">{doneSets}</span>
              </div>
              <div className="stat">
                <span className="stat-label" style={{ justifyContent: "center" }}>
                  {t("Volume")}
                </span>
                <span className="stat-value">
                  {round(sessionVolume(active))}
                  <small>kg</small>
                </span>
              </div>
            </div>
          </div>
          <p className="footnote">{t("Burned calories are added back to today's budget on the Today screen.")}</p>
          <div className="spacer" />
          <button
            className="btn green"
            onClick={() => {
              // Clocked in and straight out with nothing done: don't fill the history with an empty workout.
              if (doneSets === 0 && round(kcal) < 1) {
                actions.discardSession(active.id);
                setFinishing(false);
                setRest(null);
                showToast(t("Nothing was logged, so the workout wasn't saved"));
                return;
              }
              actions.clockOut(active.id, kcal);
              haptic("success");
              setFinishing(false);
              setRest(null);
              const saved = getState().sessions.find((x) => x.id === active.id);
              if (saved) setJustFinished(saved);
              showToast(t("Workout saved · {kcal} kcal", { kcal: round(kcal) }));
            }}
          >
            <Check size={18} /> {t("Finish workout")}
          </button>
          <div className="spacer" />
          <button className="btn secondary" onClick={() => setFinishing(false)}>
            {t("Keep going")}
          </button>
          <div className="spacer" />
          <button
            className="btn secondary"
            style={{ color: "var(--red)" }}
            onClick={async () => {
              if (await confirmDialog(t("Discard workout?"), t("This workout won't be saved."), t("Discard"))) {
                actions.discardSession(active.id);
                setFinishing(false);
              }
            }}
          >
            {t("Discard workout")}
          </button>
        </Sheet>

        <ExerciseLibrary open={library !== null} onClose={() => setLibrary(null)} onPick={onPick} />
        <AnimatePresence>{rest && <RestBar rest={rest} onChange={setRest} />}</AnimatePresence>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="large-title" style={{ marginTop: 14 }}>
        {t("Train")}
      </h1>
      <p className="subtitle">{t("Clock in when you start, clock out when you're done.")}</p>

      <motion.button className="card pressable" data-tour="clock-in" style={{ width: "100%", textAlign: "left", display: "block" }} onClick={() => clockIn(t("Workout"))}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="icon-tile" style={{ width: 52, height: 52, borderRadius: 16, background: "var(--green)" }}>
            <LogIn size={24} />
          </div>
          <div className="row-main">
            <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>{t("Clock in")}</div>
            <div className="row-sub">{t("Start a free workout — timer and calories run live")}</div>
          </div>
        </div>
      </motion.button>

      {todaysPlan ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.02em", fontWeight: 600 }}>
            {t("Today's plan")}
          </div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", marginTop: 4 }}>{todaysPlan.title}</div>
          <div className="row-sub">
            {todaysPlan.focus} · {plural(todaysPlan.exercises.length, "exercise")} · ~{todaysPlan.estMinutes} min
          </div>
          <div className="spacer" />
          <button
            className="btn"
            onClick={() =>
              clockIn(
                todaysPlan.title,
                // Start each lift at the weight progressive overload suggests from last time.
                sessionFromPlan(todaysPlan).map((e) => {
                  const next = suggestNext(lastPerformance(sessions, e.exerciseId), e.targetReps, e.exerciseId);
                  return next ? { ...e, sets: e.sets?.map((x) => ({ ...x, weightKg: next.weightKg })) } : e;
                }),
              )
            }
          >
            <LogIn size={18} /> {t("Clock in & start {title}", { title: todaysPlan.title })}
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600 }}>{t("Rest day")}</div>
          <div className="row-sub" style={{ whiteSpace: "normal" }}>
            {t("No session planned today. Light cardio or a walk helps recovery.")}
          </div>
        </div>
      )}

      <div className="tiles" style={{ marginTop: 12 }}>
        <button className="tile" data-tour="log-activity" onClick={() => setLibrary("log")}>
          <div className="icon-tile" style={{ background: "var(--orange)" }}>
            <Flame size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Log activity")}</div>
            <div className="tile-sub">{t("Run, futsal, swim…")}</div>
          </div>
        </button>
        <button className="tile" onClick={() => setLibrary("browse")}>
          <div className="icon-tile" style={{ background: "var(--indigo)" }}>
            <Dumbbell size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Exercise library")}</div>
            <div className="tile-sub">{t("Form cues & calories")}</div>
          </div>
        </button>
      </div>

      <div className="section-header">{t("This week")}</div>
      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">{t("Workouts")}</span>
            <span className="stat-value">{week.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t("Time")}</span>
            <span className="stat-value">
              {round(week.reduce((a, s) => a + sessionMinutes(s), 0) / 60, 1)}
              <small>h</small>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">{t("Burned")}</span>
            <span className="stat-value">
              {round(week.reduce((a, s) => a + s.kcal, 0))}
              <small>kcal</small>
            </span>
          </div>
        </div>
      </div>

      {justFinished && (
        <div className="card done-card" style={{ marginTop: 12 }}>
          <div className="row-main">
            <div className="tile-title">{t("Nice work! {title} saved", { title: justFinished.title })}</div>
            <div className="tile-sub">{t("{kcal} kcal burned. Share it with friends?", { kcal: justFinished.kcal })}</div>
          </div>
          <button className="btn small tinted" onClick={() => shareWorkout(justFinished)}>
            <Share size={15} /> {t("Share")}
          </button>
        </div>
      )}

      {records.length > 0 && (
        <>
          <div className="section-header">{t("Personal records")}</div>
          <div className="group" data-testid="records">
            {records.slice(0, 6).map((r) => (
              <div className="row with-icon" key={r.exerciseId}>
                <div className="icon-tile" style={{ background: "var(--yellow)", color: "#1d1d1f" }}>
                  <Trophy size={16} />
                </div>
                <div className="row-main">
                  <div className="row-title">{r.name}</div>
                  <div className="row-sub">
                    {r.weightKg} kg × {r.reps} · {t("est. 1-rep max {kg} kg", { kg: round(r.e1rm) })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-header">{t("History")}</div>
      <div className="group">
        {history.length === 0 ? (
          <Empty icon={<History size={28} />}>{t("Your finished workouts will appear here.")}</Empty>
        ) : (
          history.slice(0, 30).map((s) => (
            <div className="row with-icon" key={s.id}>
              <div className="icon-tile" style={{ background: "var(--orange)" }}>
                <Dumbbell size={17} />
              </div>
              <div className="row-main">
                <div className="row-title">{s.title}</div>
                <div className="row-sub">
                  {new Date(s.startedAt).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                  {formatDuration(sessionMinutes(s))} · {plural(s.exercises.length, "exercise")}
                </div>
              </div>
              <span className="row-value">{s.kcal} kcal</span>
              <button className="icon-btn" aria-label={t("Share {title}", { title: s.title })} onClick={() => shareWorkout(s)}>
                <Share size={15} />
              </button>
              <button
                className="icon-btn"
                aria-label={t("Delete {title}", { title: s.title })}
                onClick={() => {
                  actions.discardSession(s.id);
                  showToast(t("Deleted {title}", { title: s.title }), { label: t("Undo"), run: () => actions.addSession(s) });
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      <ExerciseLibrary
        open={library !== null}
        onClose={() => setLibrary(null)}
        onPick={library === "browse" ? undefined : onPick}
        pickLabel={library === "log" ? t("Log activity") : t("Clock in with this")}
      />
    </div>
  );
}

/** Last time's sets and what to do today (progressive overload). */
function LiftHistory({ exerciseId, targetReps, sessionId }: { exerciseId: string; targetReps?: string; sessionId: string }) {
  useLanguage();
  const sessions = useStore((s) => s.sessions);
  const last = lastPerformance(sessions, exerciseId, sessionId);
  if (!last) return null;
  const next = suggestNext(last, targetReps, exerciseId);
  const top = Math.max(...last.sets.map((x) => x.weightKg));
  return (
    <div className="lift-history">
      {t("Last time")}: {top} kg × {last.sets.filter((x) => x.weightKg === top).map((x) => x.reps).join(", ")}
      {next && <div className="lift-next">↗ {next.text}</div>}
    </div>
  );
}

function SetRow({
  index,
  set,
  onChange,
}: {
  index: number;
  set: { reps: number; weightKg: number; done: boolean };
  onChange: (s: { reps: number; weightKg: number; done: boolean }) => void;
}) {
  useLanguage();
  return (
    <>
      <span className="muted" style={{ fontWeight: 600 }}>
        {index + 1}
      </span>
      <NumberInput className="num-input" style={{ width: "100%" }} value={set.weightKg} max={1000} emptyValue={0} placeholder="0" aria-label={t("Set {n} weight", { n: index + 1 })} onChange={(v) => onChange({ ...set, weightKg: v })} />
      <NumberInput className="num-input" style={{ width: "100%" }} integer value={set.reps} max={1000} emptyValue={0} placeholder="0" aria-label={t("Set {n} reps", { n: index + 1 })} onChange={(v) => onChange({ ...set, reps: v })} />
      <button
        className={`check ${set.done ? "on" : ""}`}
        aria-label={set.done ? t("Mark set not done") : t("Mark set done")}
        aria-pressed={set.done}
        onClick={() => {
          if (!set.done) haptic("light");
          onChange({ ...set, done: !set.done });
        }}
      >
        <Check size={18} strokeWidth={3} />
      </button>
    </>
  );
}
