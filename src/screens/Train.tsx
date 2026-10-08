import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Dumbbell, Flame, History, LogIn, LogOut, Plus, Trash2, Weight } from "lucide-react";
import { ExerciseLibrary } from "../components/ExerciseLibrary";
import { Empty, SPRING, Sheet, Stepper, haptic, showToast, useNow } from "../components/ui";
import { buildPlan, exerciseKcal, formatDuration, kcalFor, plural, sessionFromPlan, sessionKcal, sessionMinutes, sessionVolume } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { confirmDialog } from "../lib/platform";
import { actions, todayKey, uid, useStore, useTodayKey, weekdayOf } from "../lib/store";
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

export function Train() {
  const profile = useStore((s) => s.profile);
  const sessions = useStore((s) => s.sessions);
  const activeId = useStore((s) => s.activeSessionId);
  const split = useStore((s) => s.split);
  const active = sessions.find((s) => s.id === activeId) ?? null;
  const now = useNow(1000, !!active);
  const [library, setLibrary] = useState<"add" | "log" | "browse" | null>(null);
  const [finishing, setFinishing] = useState(false);

  const plan = useMemo(() => buildPlan(profile, split), [profile, split]);
  const weekday = weekdayOf(useTodayKey());
  const todaysPlan = plan.days.find((d) => d.weekday === weekday);
  const history = sessions.filter((s) => s.endedAt);
  const weekAgo = Date.now() - 7 * 86400000;
  const week = history.filter((s) => s.startedAt >= weekAgo);

  const clockIn = (title: string, exercises: SessionExercise[] = []) => {
    actions.clockIn(title, exercises);
    haptic("success");
    showToast(`Clocked in at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
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
      showToast(`Logged ${ex.name} · ${session.kcal} kcal`);
      return;
    }
    if (!active) {
      clockIn(ex.kind === "cardio" ? ex.name : "Workout", [toSessionExercise(ex, minutes)]);
      return;
    }
    update((s) => ({ ...s, exercises: [...s.exercises, toSessionExercise(ex, minutes)] }));
  };

  if (active) {
    const minutes = sessionMinutes(active, now);
    const kcal = sessionKcal(active, profile.weightKg, now);
    const doneSets = active.exercises.reduce((a, e) => a + (e.sets ?? []).filter((x) => x.done).length, 0);
    return (
      <div className="screen">
        <div className="title-row" style={{ marginTop: 14 }}>
          <h1 className="large-title">{active.title}</h1>
          <span className="badge" style={{ background: "var(--green-fill)", color: "#fff", marginBottom: 8 }}>
            <span className="pulse" style={{ width: 7, height: 7 }} /> LIVE
          </span>
        </div>
        <p className="subtitle">Clocked in at {new Date(active.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>

        <div className="card">
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">
                <Clock size={13} /> Time
              </span>
              <span className="stat-value tabular">{formatDuration(minutes)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">
                <Flame size={13} color="var(--orange)" /> Burned
              </span>
              <span className="stat-value">
                {round(kcal)}
                <small>kcal</small>
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">
                <Weight size={13} /> Volume
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
                    {ex.targetReps ? `Target ${ex.sets?.length} × ${ex.targetReps} · ` : ""}
                    {round(exerciseKcal(ex, profile.weightKg))} kcal
                  </div>
                </div>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${ex.name}`}
                  onClick={() => update((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== ex.id) }))}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {ex.kind === "cardio" ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="muted">Duration</span>
                  <Stepper value={ex.minutes ?? 0} step={5} min={0} max={600} format={(v) => `${v} min`} onChange={(v) => updateEx(ex.id, (e) => ({ ...e, minutes: v }))} />
                </div>
              ) : (
                <>
                  <div className="set-grid">
                    <span className="head">Set</span>
                    <span className="head">kg</span>
                    <span className="head">Reps</span>
                    <span />
                    {(ex.sets ?? []).map((set, i) => (
                      <SetRow
                        key={i}
                        index={i}
                        set={set}
                        onChange={(next) => updateEx(ex.id, (e) => ({ ...e, sets: e.sets!.map((s, j) => (j === i ? next : s)) }))}
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
                    <Plus size={15} /> Add set
                  </button>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {active.exercises.length === 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <Empty icon={<Dumbbell size={28} />}>
              Add the exercises you do for a more accurate calorie count. Until then time is counted as general gym training.
            </Empty>
          </div>
        )}

        <div className="spacer" />
        <button className="btn tinted" onClick={() => setLibrary("add")}>
          <Plus size={18} /> Add exercise
        </button>
        <div className="spacer" />
        <button className="btn red" data-tour="clock-out" onClick={() => setFinishing(true)}>
          <LogOut size={18} /> Clock out
        </button>

        <Sheet open={finishing} onClose={() => setFinishing(false)} title="Clock out">
          <div className="card" style={{ textAlign: "center" }}>
            <div className="muted">{active.title}</div>
            <div className="big-number" style={{ margin: "8px 0" }}>
              {round(kcal)}
            </div>
            <div className="muted">kcal burned</div>
            <div className="spacer" />
            <div className="stat-grid">
              <div className="stat">
                <span className="stat-label" style={{ justifyContent: "center" }}>
                  Time
                </span>
                <span className="stat-value tabular">{formatDuration(minutes)}</span>
              </div>
              <div className="stat">
                <span className="stat-label" style={{ justifyContent: "center" }}>
                  Sets
                </span>
                <span className="stat-value">{doneSets}</span>
              </div>
              <div className="stat">
                <span className="stat-label" style={{ justifyContent: "center" }}>
                  Volume
                </span>
                <span className="stat-value">
                  {round(sessionVolume(active))}
                  <small>kg</small>
                </span>
              </div>
            </div>
          </div>
          <p className="footnote">Burned calories are added back to today's budget on the Today screen.</p>
          <div className="spacer" />
          <button
            className="btn green"
            onClick={() => {
              actions.clockOut(active.id, kcal);
              haptic("success");
              setFinishing(false);
              showToast(`Workout saved · ${round(kcal)} kcal`);
            }}
          >
            <Check size={18} /> Finish workout
          </button>
          <div className="spacer" />
          <button className="btn secondary" onClick={() => setFinishing(false)}>
            Keep going
          </button>
          <div className="spacer" />
          <button
            className="btn secondary"
            style={{ color: "var(--red)" }}
            onClick={async () => {
              if (await confirmDialog("Discard workout?", "This workout won't be saved.", "Discard")) {
                actions.discardSession(active.id);
                setFinishing(false);
              }
            }}
          >
            Discard workout
          </button>
        </Sheet>

        <ExerciseLibrary open={library !== null} onClose={() => setLibrary(null)} onPick={onPick} />
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="large-title" style={{ marginTop: 14 }}>
        Train
      </h1>
      <p className="subtitle">Clock in when you start, clock out when you're done.</p>

      <motion.button className="card pressable" data-tour="clock-in" style={{ width: "100%", textAlign: "left", display: "block" }} onClick={() => clockIn("Workout")}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="icon-tile" style={{ width: 52, height: 52, borderRadius: 16, background: "var(--green)" }}>
            <LogIn size={24} />
          </div>
          <div className="row-main">
            <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>Clock in</div>
            <div className="row-sub">Start a free workout — timer and calories run live</div>
          </div>
        </div>
      </motion.button>

      {todaysPlan ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.02em", fontWeight: 600 }}>
            Today's plan
          </div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", marginTop: 4 }}>{todaysPlan.title}</div>
          <div className="row-sub">
            {todaysPlan.focus} · {plural(todaysPlan.exercises.length, "exercise")} · ~{todaysPlan.estMinutes} min
          </div>
          <div className="spacer" />
          <button className="btn" onClick={() => clockIn(todaysPlan.title, sessionFromPlan(todaysPlan))}>
            <LogIn size={18} /> Clock in &amp; start {todaysPlan.title}
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600 }}>Rest day</div>
          <div className="row-sub" style={{ whiteSpace: "normal" }}>
            No session planned today. Light cardio or a walk helps recovery.
          </div>
        </div>
      )}

      <div className="tiles" style={{ marginTop: 12 }}>
        <button className="tile" data-tour="log-activity" onClick={() => setLibrary("log")}>
          <div className="icon-tile" style={{ background: "var(--orange)" }}>
            <Flame size={18} />
          </div>
          <div>
            <div className="tile-title">Log activity</div>
            <div className="tile-sub">Run, futsal, swim…</div>
          </div>
        </button>
        <button className="tile" onClick={() => setLibrary("browse")}>
          <div className="icon-tile" style={{ background: "var(--indigo)" }}>
            <Dumbbell size={18} />
          </div>
          <div>
            <div className="tile-title">Exercise library</div>
            <div className="tile-sub">Form cues &amp; calories</div>
          </div>
        </button>
      </div>

      <div className="section-header">This week</div>
      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Workouts</span>
            <span className="stat-value">{week.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Time</span>
            <span className="stat-value">
              {round(week.reduce((a, s) => a + sessionMinutes(s), 0) / 60, 1)}
              <small>h</small>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Burned</span>
            <span className="stat-value">
              {round(week.reduce((a, s) => a + s.kcal, 0))}
              <small>kcal</small>
            </span>
          </div>
        </div>
      </div>

      <div className="section-header">History</div>
      <div className="group">
        {history.length === 0 ? (
          <Empty icon={<History size={28} />}>Your finished workouts will appear here.</Empty>
        ) : (
          history.slice(0, 30).map((s) => (
            <div className="row with-icon" key={s.id}>
              <div className="icon-tile" style={{ background: "var(--orange)" }}>
                <Dumbbell size={17} />
              </div>
              <div className="row-main">
                <div className="row-title">{s.title}</div>
                <div className="row-sub">
                  {new Date(s.startedAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                  {formatDuration(sessionMinutes(s))} · {plural(s.exercises.length, "exercise")}
                </div>
              </div>
              <span className="row-value">{s.kcal} kcal</span>
              <button
                className="icon-btn"
                aria-label={`Delete ${s.title}`}
                onClick={() => {
                  actions.discardSession(s.id);
                  showToast(`Deleted ${s.title}`, { label: "Undo", run: () => actions.addSession(s) });
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
        pickLabel={library === "log" ? "Log activity" : "Clock in with this"}
      />
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
  const parse = (v: string) => Math.max(0, parseFloat(v.replace(",", ".")) || 0);
  return (
    <>
      <span className="muted" style={{ fontWeight: 600 }}>
        {index + 1}
      </span>
      <input className="num-input" style={{ width: "100%" }} inputMode="decimal" value={set.weightKg || ""} placeholder="0" aria-label={`Set ${index + 1} weight`} onChange={(e) => onChange({ ...set, weightKg: parse(e.target.value) })} />
      <input className="num-input" style={{ width: "100%" }} inputMode="numeric" value={set.reps || ""} placeholder="0" aria-label={`Set ${index + 1} reps`} onChange={(e) => onChange({ ...set, reps: Math.round(parse(e.target.value)) })} />
      <button
        className={`check ${set.done ? "on" : ""}`}
        aria-label={set.done ? "Mark set not done" : "Mark set done"}
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
