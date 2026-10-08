import { useMemo } from "react";
import { motion } from "motion/react";
import { Camera, ChevronRight, Dumbbell, Flame, Scale, Search, Trash2, Utensils } from "lucide-react";
import { MEALS } from "../lib/api";
import { formatDuration, plural, sessionKcal, sessionMinutes } from "../lib/fitness";
import { bmi, round, sum, targets } from "../lib/nutrition";
import { bmiBand } from "../lib/recommend";
import { actions, useStore, useTodayKey } from "../lib/store";
import type { LogEntry } from "../lib/types";
import { Bar, MacroBars, Ring, SPRING, showToast, useNow } from "../components/ui";
import type { Tab } from "../App";

export function Today({ go, openPhoto, openBodyCheck }: { go: (t: Tab) => void; openPhoto: () => void; openBodyCheck: () => void }) {
  const profile = useStore((s) => s.profile);
  const log = useStore((s) => s.log);
  const sessions = useStore((s) => s.sessions);
  const activeId = useStore((s) => s.activeSessionId);
  const now = useNow(1000, !!activeId);
  const today = useTodayKey();
  const t = targets(profile);
  const bmiValue = bmi(profile);

  const entries = useMemo(() => log.filter((e) => e.date === today), [log, today]);
  const eaten = useMemo(() => sum(entries.map((e) => e.nutrients)), [entries]);
  const todaysSessions = sessions.filter((s) => s.date === today);
  const active = sessions.find((s) => s.id === activeId);
  const burned = todaysSessions.reduce((a, s) => a + (s.endedAt ? s.kcal : sessionKcal(s, profile.weightKg, now)), 0);
  const remaining = t.kcal - eaten.kcal + burned;

  const date = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const remove = (e: LogEntry) => {
    actions.removeLog(e.id);
    showToast(`Removed ${e.name}`, { label: "Undo", run: () => actions.restoreLog(e) });
  };

  return (
    <div className="screen">
      <p className="subtitle" style={{ margin: "8px 0 0", textTransform: "uppercase", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>
        {date}
      </p>
      <h1 className="large-title">
        {greet}
        {profile.name ? `, ${profile.name}` : ""}
      </h1>
      <div className="spacer" />

      {active && (
        <motion.button className="live-banner pressable" onClick={() => go("train")} layout transition={SPRING} style={{ marginBottom: 12 }}>
          <span className="pulse" />
          <div className="row-main">
            <div style={{ fontWeight: 600 }}>{active.title} · clocked in</div>
            <div style={{ fontSize: 14, opacity: 0.85 }} className="tabular">
              {formatDuration(sessionMinutes(active, now))} · {round(sessionKcal(active, profile.weightKg, now))} kcal
            </div>
          </div>
          <ChevronRight size={18} />
        </motion.button>
      )}

      <div className="card">
        <div data-tour="summary" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Ring progress={eaten.kcal / (t.kcal + burned)} size={136} stroke={14}>
            <div>
              <div className="stat-value" style={{ fontSize: 28, color: remaining < 0 ? "var(--red)" : undefined }}>
                {Math.abs(round(remaining))}
              </div>
              <div className="stat-label" style={{ justifyContent: "center" }}>
                {remaining < 0 ? "kcal over" : "kcal left"}
              </div>
            </div>
          </Ring>
          <div style={{ display: "grid", gap: 12, flex: 1 }}>
            <div className="stat">
              <span className="stat-label">
                <Utensils size={13} /> Eaten
              </span>
              <span className="stat-value">
                {round(eaten.kcal)}
                <small>kcal</small>
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">
                <Flame size={13} color="var(--orange)" /> Burned
              </span>
              <span className="stat-value">
                {round(burned)}
                <small>kcal</small>
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Daily target</span>
              <span className="stat-value">
                {t.kcal}
                <small>kcal</small>
              </span>
            </div>
          </div>
        </div>
        <div className="spacer" />
        <div className="spacer" />
        <MacroBars n={eaten} t={t} />
      </div>

      <div className="tiles" style={{ marginTop: 12 }}>
        <button className="tile" onClick={openPhoto} data-tour="scan">
          <div className="icon-tile" style={{ background: "var(--blue)" }}>
            <Camera size={18} />
          </div>
          <div>
            <div className="tile-title">Scan meal</div>
            <div className="tile-sub">Calories from a photo</div>
          </div>
        </button>
        <button className="tile" onClick={() => go("food")}>
          <div className="icon-tile" style={{ background: "var(--orange)" }}>
            <Search size={18} />
          </div>
          <div>
            <div className="tile-title">Search food</div>
            <div className="tile-sub">Type to look it up</div>
          </div>
        </button>
      </div>

      <button className="card pressable" data-tour="body-check" onClick={openBodyCheck} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <div className="icon-tile" style={{ background: bmiBand(bmiValue).color }}>
          <Scale size={18} />
        </div>
        <div className="row-main">
          <div className="tile-title">Body check · BMI {bmiValue.toFixed(1)}</div>
          <div className="tile-sub">
            {bmiBand(bmiValue).label} · see what to train and eat
          </div>
        </div>
        <ChevronRight size={18} className="chev" />
      </button>

      <div className="section-header">Today's limits</div>
      <div className="card">
        {[
          { k: "Sugar", v: eaten.sugar, max: t.sugarMax, unit: "g", color: "var(--purple)" },
          { k: "Saturated fat", v: eaten.satFat, max: t.satFatMax, unit: "g", color: "var(--yellow)" },
          { k: "Sodium", v: eaten.sodium, max: t.sodiumMax, unit: "mg", color: "var(--teal)" },
          { k: "Fibre (goal)", v: eaten.fiber, max: t.fiber, unit: "g", color: "var(--green)" },
        ].map((x, i) => (
          <div key={x.k} style={{ marginTop: i ? 12 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 6 }}>
              <span>{x.k}</span>
              <span className="muted tabular">
                {round(x.v)} / {x.max} {x.unit}
              </span>
            </div>
            <Bar value={x.v} max={x.max} color={x.color} />
          </div>
        ))}
      </div>

      {MEALS.map((m) => {
        const list = entries.filter((e) => e.meal === m.value);
        const kcal = list.reduce((a, e) => a + e.nutrients.kcal, 0);
        return (
          <div key={m.value}>
            <div className="section-header">
              <span>
                {m.label}
                {list.length > 0 && ` · ${round(kcal)} kcal`}
              </span>
              <button onClick={() => go("food")}>Add</button>
            </div>
            <div className="group">
              {list.length === 0 ? (
                <div className="row muted" style={{ fontSize: 15 }}>
                  Nothing logged yet
                </div>
              ) : (
                list.map((e) => (
                  <div className="row" key={e.id}>
                    <div className="row-main">
                      <div className="row-title">{e.name}</div>
                      <div className="row-sub">
                        {round(e.grams)} g · P {round(e.nutrients.protein)} · C {round(e.nutrients.carbs)} · F {round(e.nutrients.fat)}
                      </div>
                    </div>
                    <span className="row-value">{round(e.nutrients.kcal)}</span>
                    <button className="icon-btn" aria-label={`Remove ${e.name}`} onClick={() => remove(e)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      <div className="section-header">
        Workouts
        <button onClick={() => go("train")}>{active ? "Open" : "Clock in"}</button>
      </div>
      <div className="group">
        {todaysSessions.length === 0 ? (
          <div className="row muted" style={{ fontSize: 15 }}>
            No workouts today
          </div>
        ) : (
          todaysSessions.map((s) => (
            <button className="row with-icon" key={s.id} onClick={() => go("train")}>
              <div className="icon-tile" style={{ background: s.endedAt ? "var(--orange)" : "var(--green)" }}>
                <Dumbbell size={17} />
              </div>
              <div className="row-main">
                <div className="row-title">{s.title}</div>
                <div className="row-sub">
                  {formatDuration(sessionMinutes(s, now))} · {plural(s.exercises.length, "exercise")} {s.endedAt ? "" : "· in progress"}
                </div>
              </div>
              <span className="row-value">{round(s.endedAt ? s.kcal : sessionKcal(s, profile.weightKg, now))} kcal</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
