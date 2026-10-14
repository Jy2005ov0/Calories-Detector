import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Dumbbell, Link2, MapPin, Pause, Play, Plus, Square, Trash2 } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { exName, useExerciseNames } from "../i18n/exercises";
import { EXERCISE_BY_NAME } from "../data/exercises";
import { exerciseHistory, liftedExercises, oneRepMax, platesFor, roundToPlate, trainingDays, warmupSets, weightForReps } from "../lib/lifting";
import { formatDuration } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { addDays } from "../lib/progress";
import { formatPace, pace, runKcal, simplify } from "../lib/run";
import { discard as discardRun, distance as runDistance, endPreview, finish as finishRun, paceNow, pause as pauseRun, preview, seconds as runSeconds, setAutoPause, setMode as setRunMode, signal, start as startRun, useRun } from "../lib/runTracking";
import { RunMap } from "./RunMap";
import { actions, todayKey, uid, useStore, useTodayKey } from "../lib/store";
import type { Exercise, Routine, RoutineItem, SessionExercise } from "../lib/types";
import { TrendChart } from "./Charts";
import { ExerciseLibrary } from "./ExerciseLibrary";
import { ExerciseThumb } from "./ExercisePicture";
import { Empty, NumberInput, Segmented, Sheet, Stepper, Switch, haptic, showToast, useNow } from "./ui";

// ── Gym tools: plate calculator, one-rep max, warm-ups ──

const PLATE_COLORS: Record<number, string> = { 25: "#d32f2f", 20: "#1565c0", 15: "#f9a825", 10: "#2e7d32", 5: "#eeeeee", 2.5: "#424242", 1.25: "#9e9e9e" };

export function GymToolsSheet({ open, onClose, initialKg }: { open: boolean; onClose: () => void; initialKg?: number }) {
  useLanguage();
  const [tab, setTab] = useState<"plates" | "max" | "warmup">("plates");
  const [kg, setKg] = useState(initialKg || 60);
  const [bar, setBar] = useState<"20" | "15" | "10">("20");
  const [reps, setReps] = useState(5);
  useEffect(() => {
    if (open && initialKg) setKg(initialKg);
  }, [open, initialKg]);
  const barKg = Number(bar);
  const plates = platesFor(kg, barKg);
  const max = oneRepMax(kg, reps);
  const warm = warmupSets(kg, barKg);
  return (
    <Sheet open={open} onClose={onClose} title={t("Gym tools")}>
      <Segmented
        value={tab}
        onChange={setTab}
        ariaLabel={t("Gym tools")}
        options={[
          { value: "plates", label: t("Plates") },
          { value: "max", label: t("1-rep max") },
          { value: "warmup", label: t("Warm-up") },
        ]}
      />
      <div className="group" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="gt-kg">{tab === "max" ? t("Weight lifted") : t("Working weight")}</label>
          <NumberInput id="gt-kg" value={kg} onChange={setKg} min={0} max={500} />
          <span className="muted" style={{ width: 22 }}>
            kg
          </span>
        </div>
        {tab === "max" ? (
          <div className="field">
            <label>{t("Reps done")}</label>
            <Stepper value={reps} min={1} max={20} onChange={setReps} label={t("reps")} />
          </div>
        ) : (
          <div className="field">
            <label>{t("Bar")}</label>
            <div style={{ width: 170 }}>
              <Segmented value={bar} onChange={setBar} ariaLabel={t("Bar")} options={[{ value: "20", label: "20 kg" }, { value: "15", label: "15 kg" }, { value: "10", label: "10 kg" }]} />
            </div>
          </div>
        )}
      </div>

      {tab === "plates" && (
        <div className="card" style={{ marginTop: 12 }} data-testid="plates">
          {kg < barKg ? (
            <div className="muted">{t("Less than the bar alone ({kg} kg).", { kg: barKg })}</div>
          ) : (
            <>
              <div className="tile-title">{plates.perSide.length ? t("Each side: {list}", { list: plates.perSide.map((p) => `${p}`).join(" + ") + " kg" }) : t("Just the bar")}</div>
              <div className="plate-bar" aria-hidden>
                <span className="bar-end" />
                {plates.perSide.map((p, i) => (
                  <span key={i} className="plate" style={{ background: PLATE_COLORS[p] ?? "#888", height: 28 + Math.min(p, 25) * 2.4 }} />
                ))}
              </div>
              {plates.leftover > 0 && <div className="row-sub">{t("{kg} kg can't be made with standard plates.", { kg: plates.leftover })}</div>}
            </>
          )}
        </div>
      )}

      {tab === "max" && (
        <>
          <div className="card" style={{ marginTop: 12, textAlign: "center" }}>
            <div className="muted">{t("Estimated 1-rep max")}</div>
            <div className="big-number" data-testid="one-rm">
              {round(max, 1)} kg
            </div>
          </div>
          <div className="group" style={{ marginTop: 12 }}>
            {[1, 3, 5, 8, 10, 12].map((r) => (
              <div className="row" key={r}>
                <div className="row-main">{t("{n} reps", { n: r })}</div>
                <span className="row-value tabular">{roundToPlate(weightForReps(max, r), 1.25)} kg</span>
              </div>
            ))}
          </div>
          <p className="footnote">{t("Estimates from the Epley and Brzycki formulas, most accurate up to about 10 reps.")}</p>
        </>
      )}

      {tab === "warmup" && (
        <div className="group" style={{ marginTop: 12 }} data-testid="warmups">
          {warm.length ? (
            warm.map((w, i) => (
              <div className="row" key={i}>
                <div className="row-main">{t("Warm-up {n}", { n: i + 1 })}</div>
                <span className="row-value tabular">
                  {w.kg} kg × {w.reps}
                </span>
              </div>
            ))
          ) : (
            <div className="row muted">{t("No warm-up sets needed for a weight this light.")}</div>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ── Routines with supersets ──

/** The session exercises for a routine: sets ready to fill in, supersets kept together. */
export function sessionFromRoutine(r: Routine): SessionExercise[] {
  return r.items.map((i) => ({
    id: uid(),
    exerciseId: i.exerciseId,
    name: i.name,
    kind: i.kind,
    met: i.met,
    minutes: i.kind === "cardio" ? (i.minutes ?? 20) : undefined,
    sets: i.kind === "strength" ? Array.from({ length: i.sets }, () => ({ reps: parseInt(i.reps) || 10, weightKg: 0, done: false })) : undefined,
    targetReps: i.kind === "strength" ? i.reps : undefined,
    group: i.group,
  }));
}

/** Give each run of linked exercises its own letter (A, B, …) so supersets show up clearly. */
export function relabelGroups(items: (RoutineItem & { linked?: boolean })[]): RoutineItem[] {
  let letter = 0;
  return items.map((it, i) => {
    const startsGroup = !it.linked && items[i + 1]?.linked;
    const inGroup = it.linked || startsGroup;
    if (startsGroup) letter++;
    const { linked: _l, ...rest } = it;
    return { ...rest, group: inGroup ? String.fromCharCode(64 + letter) : undefined };
  });
}

export function RoutineEditor({ open, onClose, routine }: { open: boolean; onClose: () => void; routine: Routine | null }) {
  useLanguage();
  useExerciseNames();
  const [name, setName] = useState("");
  const [items, setItems] = useState<(RoutineItem & { linked?: boolean })[]>([]);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(routine?.name ?? "");
    setItems((routine?.items ?? []).map((it, i, all) => ({ ...it, linked: !!it.group && all[i - 1]?.group === it.group })));
  }, [open, routine]);
  const add = (ex: Exercise) => setItems((list) => [...list, { exerciseId: ex.id, name: ex.name, kind: ex.kind, met: ex.met, sets: 3, reps: "8–12", minutes: ex.kind === "cardio" ? 20 : undefined }]);
  const valid = name.trim() && items.length > 0;
  return (
    <Sheet open={open} onClose={onClose} title={routine ? t("Edit routine") : t("New routine")}>
      <div className="group">
        <div className="field">
          <label htmlFor="rt-name">{t("Name")}</label>
          <input id="rt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Push day")} maxLength={40} />
        </div>
      </div>
      <div className="section-header">{t("Exercises")}</div>
      {items.length === 0 && <p className="footnote">{t("Add exercises, then link two or more to make a superset: done back to back, resting only after the last one.")}</p>}
      {items.map((it, i) => (
        <div className={`card routine-item ${it.linked ? "linked" : ""}`} key={`${it.exerciseId}-${i}`} style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ExerciseThumb name={it.name} size={36} />
            <div className="row-main">
              <div style={{ fontWeight: 600 }}>{exName(it.name)}</div>
            </div>
            <button className="icon-btn" aria-label={t("Remove {name}", { name: exName(it.name) })} onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
              <Trash2 size={15} />
            </button>
          </div>
          {it.kind === "strength" ? (
            <div className="routine-fields">
              <Stepper value={it.sets} min={1} max={10} onChange={(sets) => setItems((l) => l.map((x, j) => (j === i ? { ...x, sets } : x)))} format={(v) => t("{n} sets", { n: v })} label={t("sets")} />
              <input className="reps-input" aria-label={t("Reps for {name}", { name: exName(it.name) })} value={it.reps} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, reps: e.target.value.slice(0, 8) } : x)))} />
              <span className="muted">{t("reps")}</span>
            </div>
          ) : (
            <div className="routine-fields">
              <Stepper value={it.minutes ?? 20} step={5} min={5} max={180} onChange={(minutes) => setItems((l) => l.map((x, j) => (j === i ? { ...x, minutes } : x)))} format={(v) => `${v} min`} label={t("minutes")} />
            </div>
          )}
          {i > 0 && (
            <div className="field" style={{ padding: "8px 0 0", minHeight: 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link2 size={14} /> {t("Superset with the one above")}
              </label>
              <Switch checked={!!it.linked} onChange={(linked) => setItems((l) => l.map((x, j) => (j === i ? { ...x, linked } : x)))} label={t("Superset {name} with the one above", { name: exName(it.name) })} />
            </div>
          )}
        </div>
      ))}
      <div className="spacer" />
      <button className="btn tinted" onClick={() => setPicking(true)}>
        <Plus size={18} /> {t("Add exercise")}
      </button>
      <div className="spacer" />
      <button
        className="btn"
        disabled={!valid}
        onClick={() => {
          actions.saveRoutine({ id: routine?.id ?? uid(), name: name.trim(), items: relabelGroups(items) });
          haptic("success");
          showToast(t("Saved {name}", { name: name.trim() }));
          onClose();
        }}
      >
        {t("Save routine")}
      </button>
      <ExerciseLibrary
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(ex) => {
          add(ex);
          setPicking(false);
        }}
        pickLabel={t("Add to routine")}
      />
    </Sheet>
  );
}

export function RoutinesSection({ onStart }: { onStart: (r: Routine) => void }) {
  useLanguage();
  useExerciseNames();
  const routines = useStore((s) => s.routines);
  const [editing, setEditing] = useState<{ open: boolean; routine: Routine | null }>({ open: false, routine: null });
  return (
    <>
      <div className="section-header">
        {t("My routines")}
        <button onClick={() => setEditing({ open: true, routine: null })}>{t("New")}</button>
      </div>
      <div className="group" data-testid="routines">
        {routines.length === 0 ? (
          <Empty icon={<Dumbbell size={28} />}>{t("Save your own workouts, with supersets, and start them in one tap.")}</Empty>
        ) : (
          routines.map((r) => (
            <div className="row" key={r.id}>
              <button className="row-main pressable" style={{ textAlign: "left" }} onClick={() => setEditing({ open: true, routine: r })}>
                <div className="row-title">{r.name}</div>
                <div className="row-sub">
                  {r.items.map((i) => (i.group ? `${i.group}·` : "") + exName(i.name)).join(", ")}
                </div>
              </button>
              <button className="btn small tinted" onClick={() => onStart(r)}>
                <Play size={14} /> {t("Start")}
              </button>
              <button
                className="icon-btn"
                aria-label={t("Delete {name}", { name: r.name })}
                onClick={() => {
                  actions.deleteRoutine(r.id);
                  showToast(t("Deleted {name}", { name: r.name }), { label: t("Undo"), run: () => actions.saveRoutine(r) });
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
      <RoutineEditor open={editing.open} routine={editing.routine} onClose={() => setEditing({ open: false, routine: null })} />
    </>
  );
}

// ── Strength progress ──

export function StrengthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  useExerciseNames();
  const sessions = useStore((s) => s.sessions);
  const lifts = useMemo(() => liftedExercises(sessions), [sessions]);
  const [pick, setPick] = useState<string | null>(null);
  const id = pick ?? lifts[0]?.exerciseId ?? null;
  const hist = useMemo(() => (id ? exerciseHistory(sessions, id) : []), [sessions, id]);
  const name = lifts.find((l) => l.exerciseId === id)?.name ?? "";
  return (
    <Sheet open={open} onClose={onClose} title={t("Strength progress")}>
      {lifts.length === 0 ? (
        <Empty icon={<Dumbbell size={28} />}>{t("Log weights in your workouts and your strength over time shows up here.")}</Empty>
      ) : (
        <>
          <div className="chips">
            {lifts.slice(0, 12).map((l) => (
              <button key={l.exerciseId} className={`chip ${l.exerciseId === id ? "active" : ""}`} aria-pressed={l.exerciseId === id} onClick={() => setPick(l.exerciseId)}>
                {exName(l.name)}
              </button>
            ))}
          </div>
          <div className="card" style={{ marginTop: 12 }} data-testid="strength-chart">
            <div className="tile-title">{t("Estimated 1-rep max")}</div>
            {hist.length > 1 ? (
              <TrendChart points={hist.map((h) => ({ date: h.date, value: h.best }))} unit="kg" color="var(--orange)" label={exName(name)} />
            ) : (
              <div className="row-sub" style={{ marginTop: 6 }}>
                {t("One workout so far: {kg} kg. Do it again to see a trend.", { kg: hist[0]?.best ?? 0 })}
              </div>
            )}
          </div>
          {hist.length > 1 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="tile-title">{t("Volume (kg × reps)")}</div>
              <TrendChart points={hist.map((h) => ({ date: h.date, value: h.volume }))} unit="kg" color="var(--blue)" label={t("Volume")} />
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

/** The last 12 weeks, one square a day, darker the longer you trained. */
export function WorkoutCalendar() {
  useLanguage();
  const sessions = useStore((s) => s.sessions);
  const today = useTodayKey();
  const map = useMemo(() => trainingDays(sessions), [sessions]);
  const weeks = 12;
  // Columns are weeks (Mon–Sun rows), ending this week.
  const [y, m, d] = today.split("-").map(Number);
  const mondayOffset = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const trained = days.filter((x) => (map.get(x) ?? 0) > 0 && x <= today).length;
  const level = (min: number) => (min <= 0 ? 0 : min < 30 ? 1 : min < 60 ? 2 : 3);
  return (
    <div className="card" data-testid="workout-calendar">
      <div className="tile-title">{t("{n} training days in 12 weeks", { n: trained })}</div>
      <div className="heatmap" role="img" aria-label={t("{n} training days in 12 weeks", { n: trained })}>
        {days.map((x) => (
          <span key={x} className={`hm l${x > today ? "x" : level(map.get(x) ?? 0)}`} title={`${x}${map.get(x) ? ` · ${map.get(x)} min` : ""}`} />
        ))}
      </div>
      <div className="heatmap-legend muted">
        <span>{t("Less")}</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className={`hm l${l}`} />
        ))}
        <span>{t("More")}</span>
      </div>
    </div>
  );
}

// ── GPS run / walk ──

export function RunTracker({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const weightKg = useStore((s) => s.profile.weightKg);
  const run = useRun();
  const { status, mode } = run;
  const now = useNow(1000, open && status !== "idle");
  const seconds = runSeconds(run, now);
  const distance = runDistance(run.segments);
  const kcal = runKcal(distance, seconds, weightKg);
  const gps = signal(run, now);
  const current = paceNow(run, now);

  // While the sheet is open before starting, show where you are and how good the GPS is.
  useEffect(() => {
    if (!open) return;
    void preview();
    return () => void endPreview();
  }, [open]);

  const begin = async () => {
    if (await startRun()) haptic("success");
  };
  const finish = async () => {
    const r = await finishRun();
    const total = runDistance(r.segments);
    const secs = r.seconds;
    if (total < 50 || secs < 30) {
      showToast(t("Too short to save. Keep going a little longer next time."));
      onClose();
      return;
    }
    const kmh = total / 1000 / (secs / 3600);
    const ex = EXERCISE_BY_NAME.get(r.mode === "walk" ? "Walking, brisk (6.4 km/h)" : kmh >= 10 ? "Running (11.3 km/h, 5:18 /km)" : "Running (9.7 km/h, 6:12 /km)");
    const minutes = Math.max(1, Math.round(secs / 60));
    const kcalDone = Math.round(runKcal(total, secs, weightKg));
    actions.addSession({
      id: uid(),
      date: todayKey(),
      title: r.mode === "walk" ? t("Walk") : t("Run"),
      startedAt: r.startedAt || Date.now() - secs * 1000,
      endedAt: Date.now(),
      exercises: [{ id: uid(), exerciseId: ex?.id ?? "gps", name: ex?.name ?? (r.mode === "walk" ? "Walking" : "Running"), kind: "cardio", met: ex?.met ?? 8, minutes }],
      kcal: kcalDone,
      distanceM: Math.round(total),
      route: simplify(r.segments.flat().map((p) => [p[0], p[1]] as [number, number])),
    });
    haptic("success");
    showToast(t("Saved {km} km · {kcal} kcal", { km: (total / 1000).toFixed(2), kcal: kcalDone }));
    onClose();
  };

  const signalText = { none: t("Waiting for GPS…"), weak: t("Weak GPS"), ok: t("GPS OK"), good: t("Good GPS") }[gps];
  return (
    <Sheet
      open={open}
      full
      onClose={() => {
        // Tracking lives outside the sheet, so a run in progress keeps going while it's closed.
        if (status === "running") showToast(t("Your run keeps going. Open Track a run to see it."));
        onClose();
      }}
      title={mode === "walk" ? t("Track a walk") : t("Track a run")}
    >
      <div className="run-map-wrap">
        <RunMap segments={run.segments} here={run.here} />
        <div className={`gps-chip ${gps}`} role="status" data-testid="gps-signal">
          <i aria-hidden /> {signalText}
        </div>
        {run.autoPaused && (
          <div className="run-autopaused" role="status" data-testid="auto-paused">
            <Pause size={14} /> {t("Auto-paused · start moving to carry on")}
          </div>
        )}
      </div>
      {status === "idle" && (
        <div style={{ marginTop: 12 }}>
          <Segmented value={mode} onChange={setRunMode} ariaLabel={t("Activity")} options={[{ value: "run", label: t("Run") }, { value: "walk", label: t("Walk") }]} />
        </div>
      )}
      <div className="card run-stats" style={{ marginTop: 12 }} data-testid="run-stats">
        <div className="stat run-distance">
          <span className="stat-label">{t("Distance")}</span>
          <span className="stat-value tabular">
            {(distance / 1000).toFixed(2)}
            <small>km</small>
          </span>
        </div>
        <div className="stat run-kcal">
          <span className="stat-label">{t("Burned")}</span>
          <span className="stat-value tabular">
            {round(kcal)}
            <small>kcal</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">{t("Time")}</span>
          <span className="stat-value tabular">{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{t("Pace now")}</span>
          <span className="stat-value tabular" data-testid="pace-now">
            {formatPace(current)}
            <small>/km</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">{t("Avg pace")}</span>
          <span className="stat-value tabular">
            {formatPace(pace(distance, seconds))}
            <small>/km</small>
          </span>
        </div>
      </div>
      {run.error && (
        <p className="footnote" style={{ color: "var(--red)" }} role="alert">
          {run.error}
        </p>
      )}
      <div className="run-controls">
        {status === "running" ? (
          <button className="btn secondary" onClick={() => void pauseRun()}>
            <Pause size={18} /> {t("Pause")}
          </button>
        ) : (
          <button className="btn green" onClick={begin}>
            <Play size={18} /> {status === "idle" ? t("Start") : t("Resume")}
          </button>
        )}
        {status !== "idle" && (
          <button className="btn" onClick={finish}>
            <Square size={16} /> {t("Finish")}
          </button>
        )}
      </div>
      {status !== "idle" && (
        <button className="link tap run-discard" onClick={() => void discardRun()}>
          {t("Discard")}
        </button>
      )}
      <div className="group" style={{ marginTop: 16 }}>
        <div className="field">
          <label>
            {t("Auto-pause")}
            <span className="field-sub">{t("Stops the clock when you stand still, at a crossing say")}</span>
          </label>
          <Switch checked={run.autoPause} onChange={setAutoPause} label={t("Auto-pause")} />
        </div>
      </div>
      <p className="footnote">{t("Keeps tracking with the screen locked or the phone in your pocket. The map needs internet; your route records without it and stays on this phone.")}</p>
    </Sheet>
  );
}

/** The route drawn as a line, scaled to fit (no map tiles, so it works offline). */
export function RouteSketch({ points }: { points: [number, number][] }) {
  if (points.length < 2) {
    return (
      <div className="route-sketch empty muted">
        <MapPin size={16} /> {t("Your route will draw here.")}
      </div>
    );
  }
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const k = Math.cos(((la0 + la1) / 2) * (Math.PI / 180));
  const w = (lo1 - lo0) * k || 1e-6;
  const h = la1 - la0 || 1e-6;
  const scale = 200 / Math.max(w, h);
  const W = 300;
  const H = 210;
  const x = (lng: number) => (W - w * scale) / 2 + (lng - lo0) * k * scale;
  const y = (lat: number) => (H - h * scale) / 2 + (la1 - lat) * scale;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p[1]).toFixed(1)},${y(p[0]).toFixed(1)}`).join(" ");
  return (
    <svg className="route-sketch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("Your route")}>
      <path d={d} fill="none" stroke="var(--orange)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points[0][1])} cy={y(points[0][0])} r={6} fill="var(--green)" />
      <circle cx={x(points[points.length - 1][1])} cy={y(points[points.length - 1][0])} r={6} fill="var(--red)" />
    </svg>
  );
}

/** Rows that open the strength charts; shown in the Train tab under the calendar. */
export function ProgressLinks({ onStrength }: { onStrength: () => void }) {
  useLanguage();
  return (
    <div className="group" style={{ marginTop: 12 }}>
      <button className="row with-icon" onClick={onStrength}>
        <div className="icon-tile" style={{ background: "var(--orange)" }}>
          <Dumbbell size={17} />
        </div>
        <div className="row-main">
          <div className="row-title">{t("Strength progress")}</div>
          <div className="row-sub">{t("Each lift's 1-rep max and volume over time")}</div>
        </div>
        <ChevronRight size={16} className="chev" />
      </button>
    </div>
  );
}

export const runSummary = (distanceM: number, minutes: number) => `${(distanceM / 1000).toFixed(2)} km · ${formatDuration(minutes)} · ${formatPace(pace(distanceM, minutes * 60))} /km`;
