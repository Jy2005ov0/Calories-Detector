import { useMemo } from "react";
import { motion } from "motion/react";
import { Barcode, Camera, Images, ChevronRight, Dumbbell, Flame, Footprints, MoonStar, Scale, Search, Sparkles, Trash2, Utensils } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { mealLabel, mealOptions } from "../lib/api";
import { formatDuration, plural, sessionKcal, sessionMinutes } from "../lib/fitness";
import { bmi, round, sum, targets } from "../lib/nutrition";
import { fastStatus, logStreak } from "../lib/progress";
import { bmiBand } from "../lib/recommend";
import { actions, useStore, useTodayKey } from "../lib/store";
import type { LogEntry, MealType } from "../lib/types";
import { Bar, MacroBars, Ring, SPRING, showToast, useNow } from "../components/ui";
import { WaterControl } from "../components/ProgressSheet";
import type { SheetKind, Tab } from "../App";

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m` : `${min}m`);

/** Where the person is in their Ramadan or 16:8 fast. */
function FastCard({ now }: { now: number }) {
  const profile = useStore((s) => s.profile);
  const f = fastStatus(profile, new Date(now));
  if (!f) return null;
  const ramadan = profile.fasting === "ramadan";
  const title = f.eating
    ? ramadan
      ? t("Sahur ends in {time}", { time: hm(f.minutesLeft) })
      : t("Eating window closes in {time}", { time: hm(f.minutesLeft) })
    : ramadan
      ? t("Iftar in {time}", { time: hm(f.minutesLeft) })
      : t("Fasting · window opens in {time}", { time: hm(f.minutesLeft) });
  const sub = ramadan ? t("Sahur until {sahur} · Iftar at {iftar}", { sahur: f.closes, iftar: f.opens }) : t("Eat between {from} and {to}", { from: f.opens, to: f.closes });
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }} data-testid="fast-card">
      <div className="icon-tile" style={{ background: f.eating ? "var(--green)" : "var(--indigo)" }}>
        <MoonStar size={18} />
      </div>
      <div className="row-main">
        <div className="tile-title">{title}</div>
        <div className="tile-sub">{sub}</div>
      </div>
    </div>
  );
}

export function Today({ go, openSheet }: { go: (t: Tab) => void; openSheet: (k: SheetKind) => void }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const log = useStore((s) => s.log);
  const sessions = useStore((s) => s.sessions);
  const activeId = useStore((s) => s.activeSessionId);
  const now = useNow(activeId ? 1000 : 30_000);
  const today = useTodayKey();
  const tg = targets(profile);
  const bmiValue = bmi(profile);

  const entries = useMemo(() => log.filter((e) => e.date === today), [log, today]);
  const eaten = useMemo(() => sum(entries.map((e) => e.nutrients)), [entries]);
  const todaysSessions = sessions.filter((s) => s.date === today);
  const active = sessions.find((s) => s.id === activeId);
  const burned = todaysSessions.reduce((a, s) => a + (s.endedAt ? s.kcal : sessionKcal(s, profile.weightKg, now)), 0);
  const remaining = tg.kcal - eaten.kcal + burned;

  const days = useStore((s) => s.days);
  const streak = useMemo(() => logStreak(log, today), [log, today]);
  const steps = days.find((d) => d.id === today)?.steps ?? 0;
  // Ramadan shows sahur / iftar / moreh; lunch only if something was logged there.
  const meals: MealType[] = [...mealOptions().map((m) => m.value), ...(["lunch"] as MealType[]).filter((m) => !mealOptions().some((o) => o.value === m) && entries.some((e) => e.meal === m))];

  const date = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
  const hour = new Date().getHours();
  const greet = hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening");

  const remove = (e: LogEntry) => {
    actions.removeLog(e.id);
    showToast(t("Removed {name}", { name: e.name }), { label: t("Undo"), run: () => actions.restoreLog(e) });
  };

  return (
    <div className="screen">
      <p className="subtitle" style={{ margin: "8px 0 0", textTransform: "uppercase", fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>
        {date}
      </p>
      <div className="title-row">
        <h1 className="large-title">
          {greet}
          {profile.name ? `, ${profile.name}` : ""}
        </h1>
        {streak > 0 && (
          <button className="streak-chip pressable" onClick={() => openSheet("progress")} aria-label={t("{n}-day logging streak", { n: streak })}>
            <Flame size={15} /> {streak}
          </button>
        )}
      </div>
      <div className="spacer" />

      {active && (
        <motion.button className="live-banner pressable" onClick={() => go("train")} layout transition={SPRING} style={{ marginBottom: 12 }}>
          <span className="pulse" />
          <div className="row-main">
            <div style={{ fontWeight: 600 }}>{t("{title} · clocked in", { title: active.title })}</div>
            <div style={{ fontSize: 14, opacity: 0.85 }} className="tabular">
              {formatDuration(sessionMinutes(active, now))} · {round(sessionKcal(active, profile.weightKg, now))} kcal
            </div>
          </div>
          <ChevronRight size={18} />
        </motion.button>
      )}

      <div className="card">
        <div data-tour="summary" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Ring progress={eaten.kcal / (tg.kcal + burned)} size={136} stroke={14}>
            <div>
              <div className="stat-value" style={{ fontSize: 28, color: remaining < 0 ? "var(--red)" : undefined }}>
                {Math.abs(round(remaining))}
              </div>
              <div className="stat-label" style={{ justifyContent: "center" }}>
                {remaining < 0 ? t("kcal over") : t("kcal left")}
              </div>
            </div>
          </Ring>
          <div style={{ display: "grid", gap: 12, flex: 1 }}>
            <div className="stat">
              <span className="stat-label">
                <Utensils size={13} /> {t("Eaten")}
              </span>
              <span className="stat-value">
                {round(eaten.kcal)}
                <small>kcal</small>
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">
                <Flame size={13} color="var(--orange)" /> {t("Burned")}
              </span>
              <span className="stat-value">
                {round(burned)}
                <small>kcal</small>
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">{t("Daily target")}</span>
              <span className="stat-value">
                {tg.kcal}
                <small>kcal</small>
              </span>
            </div>
          </div>
        </div>
        <div className="spacer" />
        <div className="spacer" />
        <MacroBars n={eaten} t={tg} />
      </div>

      <FastCard now={now} />

      <div className="tiles" style={{ marginTop: 12 }}>
        <div className="tile-wrap" data-tour="scan">
          <button className="tile" onClick={() => openSheet("photo")}>
            <div className="icon-tile" style={{ background: "var(--blue)" }}>
              <Camera size={18} />
            </div>
            <div>
              <div className="tile-title">{t("Scan meal")}</div>
              <div className="tile-sub">{t("Camera or photo library")}</div>
            </div>
          </button>
          <button className="tile-corner" onClick={() => openSheet("photoLibrary")} aria-label={t("Choose a meal photo from your library")}>
            <Images size={15} /> {t("Photos")}
          </button>
        </div>
        <button className="tile" onClick={() => go("food")}>
          <div className="icon-tile" style={{ background: "var(--orange)" }}>
            <Search size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Search food")}</div>
            <div className="tile-sub">{t("Type to look it up")}</div>
          </div>
        </button>
        <button className="tile" onClick={() => openSheet("barcode")} data-tour="barcode">
          <div className="icon-tile" style={{ background: "var(--purple)" }}>
            <Barcode size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Scan barcode")}</div>
            <div className="tile-sub">{t("Packaged food")}</div>
          </div>
        </button>
        <button className="tile" onClick={() => openSheet("coach")} data-tour="coach">
          <div className="icon-tile" style={{ background: "linear-gradient(135deg, var(--indigo), var(--purple))" }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Ask coach")}</div>
            <div className="tile-sub">{t("AI food & gym help")}</div>
          </div>
        </button>
      </div>

      <div className="card" style={{ marginTop: 12 }} data-tour="water">
        <WaterControl compact />
        <div className="hairline" />
        <button className="progress-link pressable" onClick={() => openSheet("progress")}>
          <Footprints size={17} color="var(--green)" />
          <span className="row-main tabular" style={{ textAlign: "left" }}>
            {t("{n} of {goal} steps", { n: steps.toLocaleString(locale()), goal: profile.stepGoal.toLocaleString(locale()) })}
          </span>
          <span className="link" style={{ fontSize: 15 }}>
            {t("Progress")}
          </span>
          <ChevronRight size={16} className="chev" />
        </button>
      </div>

      <button className="card pressable" data-tour="body-check" onClick={() => openSheet("bodyCheck")} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <div className="icon-tile" style={{ background: bmiBand(bmiValue).color }}>
          <Scale size={18} />
        </div>
        <div className="row-main">
          <div className="tile-title">{t("Body check · BMI {bmi}", { bmi: bmiValue.toFixed(1) })}</div>
          <div className="tile-sub">{t("{band} · see what to train and eat", { band: t(bmiBand(bmiValue).label) })}</div>
        </div>
        <ChevronRight size={18} className="chev" />
      </button>

      <div className="section-header">{t("Today's limits")}</div>
      <div className="card">
        {[
          { k: t("Sugar"), v: eaten.sugar, max: tg.sugarMax, unit: "g", color: "var(--purple)" },
          { k: t("Saturated fat"), v: eaten.satFat, max: tg.satFatMax, unit: "g", color: "var(--yellow)" },
          { k: t("Sodium"), v: eaten.sodium, max: tg.sodiumMax, unit: "mg", color: "var(--teal)" },
          { k: t("Fibre (goal)"), v: eaten.fiber, max: tg.fiber, unit: "g", color: "var(--green)" },
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

      {meals.map((m) => {
        const list = entries.filter((e) => e.meal === m);
        const kcal = list.reduce((a, e) => a + e.nutrients.kcal, 0);
        return (
          <div key={m}>
            <div className="section-header">
              <span>
                {mealLabel(m)}
                {list.length > 0 && ` · ${round(kcal)} kcal`}
              </span>
              <button onClick={() => go("food")} aria-label={t("Add to {meal}", { meal: mealLabel(m) })}>
                {t("Add")}
              </button>
            </div>
            <div className="group">
              {list.length === 0 ? (
                <div className="row muted" style={{ fontSize: 15 }}>
                  {t("Nothing logged yet")}
                </div>
              ) : (
                list.map((e) => (
                  <div className="row" key={e.id}>
                    <div className="row-main">
                      <div className="row-title">{e.name}</div>
                      <div className="row-sub">
                        {e.note ? `${e.note} · ` : ""}
                        {round(e.grams)} g · P {round(e.nutrients.protein)} · C {round(e.nutrients.carbs)} · F {round(e.nutrients.fat)}
                      </div>
                    </div>
                    <span className="row-value">{round(e.nutrients.kcal)}</span>
                    <button className="icon-btn" aria-label={t("Remove {name}", { name: e.name })} onClick={() => remove(e)}>
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
        {t("Workouts")}
        <button onClick={() => go("train")}>{active ? t("Open") : t("Clock in")}</button>
      </div>
      <div className="group">
        {todaysSessions.length === 0 ? (
          <div className="row muted" style={{ fontSize: 15 }}>
            {t("No workouts today")}
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
                  {formatDuration(sessionMinutes(s, now))} · {plural(s.exercises.length, "exercise")} {s.endedAt ? "" : `· ${t("in progress")}`}
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
