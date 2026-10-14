import { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Droplet, Trash2 } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { round } from "../lib/nutrition";
import { cycleOf, periodLength } from "../lib/cycle";
import { useCycleOpen } from "../lib/cycleLock";
import { GLASS_ML, addDays, logStreak, waterGoalMl, weightTrend, workoutWeekStreak } from "../lib/progress";
import { bmiBand } from "../lib/recommend";
import { actions, useStore, useTodayKey } from "../lib/store";
import { DayBars, WeightChart } from "./Charts";
import { BodySection } from "./BodySection";
import { Bar, NumberInput, Sheet, haptic, showToast } from "./ui";

/** Healthy weight at the top of the normal BMI band for this height (Asia-Pacific cut-off 23). */
function goalWeight(heightCm: number, weightKg: number, goal: string) {
  const m = heightCm / 100;
  const top = 22.9 * m * m;
  const bottom = 18.5 * m * m;
  if (goal === "lose" && weightKg > top) return round(top, 1);
  if (goal === "gain" && weightKg < bottom) return round(bottom, 1);
  return undefined;
}

export function ProgressSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  const days = useStore((s) => s.days);
  const log = useStore((s) => s.log);
  const sessions = useStore((s) => s.sessions);
  const periods = useStore((s) => s.periods);
  const today = useTodayKey();
  const cycleShown = useCycleOpen() && cycleOf(profile).on;
  // Periods as shaded bands on the weight chart (water weight often rises around them).
  const bands = useMemo(() => {
    if (!cycleShown) return [];
    const usual = periodLength(periods, profile.cycle.periodDays);
    return periods.map((p) => ({ from: p.date, to: p.end ?? addDays(p.date, usual - 1) }));
  }, [cycleShown, periods, profile.cycle.periodDays]);
  const [kg, setKg] = useState(String(profile.weightKg));

  useEffect(() => {
    if (open) {
      setKg(String(profile.weightKg));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const week = useMemo(() => [...Array(7).keys()].map((i) => addDays(today, i - 6)), [today]);
  const statsFor = (date: string) => days.find((d) => d.id === date);
  const trend = weightTrend(weights, today);
  const goalKg = goalWeight(profile.heightCm, profile.weightKg, profile.goal);
  const waterGoal = waterGoalMl(profile);
  const streak = logStreak(log, today);
  const gymWeeks = workoutWeekStreak(sessions, today);

  const saveWeight = () => {
    const v = parseFloat(kg.replace(",", "."));
    if (!(v >= 30 && v <= 300)) return showToast(t("Enter a weight between 30 and 300 kg"));
    actions.logWeight(round(v, 1));
    haptic("success");
    showToast(t("Weight saved · {kg} kg", { kg: round(v, 1) }));
  };

  const trendText =
    trend === null
      ? t("Log your weight a few times a week to see your trend.")
      : Math.abs(trend) < 0.1
        ? t("Holding steady over the last 4 weeks.")
        : t("{dir} {kg} kg a week over the last 4 weeks.", { dir: trend < 0 ? t("Losing") : t("Gaining"), kg: Math.abs(trend).toFixed(1) });
  const onTrack =
    trend === null ? null : profile.goal === "lose" ? trend <= -0.1 && trend >= -1 : profile.goal === "gain" ? trend >= 0.05 && trend <= 0.5 : Math.abs(trend) < 0.25;

  return (
    <Sheet open={open} onClose={onClose} title={t("Progress")}>
      <div className="stat-grid card">
        <div className="stat">
          <span className="stat-label">{t("Logging streak")}</span>
          <span className="stat-value">
            {streak}
            <small>{streak === 1 ? t("day") : t("days")}</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">{t("Gym streak")}</span>
          <span className="stat-value">
            {gymWeeks}
            <small>{gymWeeks === 1 ? t("week") : t("weeks")}</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">BMI</span>
          <span className="stat-value">{round(profile.weightKg / (profile.heightCm / 100) ** 2, 1)}</span>
          <span className="row-sub">{t(bmiBand(profile.weightKg / (profile.heightCm / 100) ** 2).label)}</span>
        </div>
      </div>

      <div className="section-header">{t("Weight")}</div>
      <div className="card">
        {weights.length >= 2 ? (
          <WeightChart weights={weights} goalKg={goalKg} bands={bands} />
        ) : (
          <p className="row-sub" style={{ whiteSpace: "normal", margin: 0 }}>
            {t("Log your weight to start your chart. Weigh yourself at the same time of day, ideally in the morning.")}
          </p>
        )}
        {bands.length > 0 && weights.length >= 2 && (
          <p className="row-sub cycle-weight-note" style={{ whiteSpace: "normal", marginTop: 8 }} data-testid="cycle-weight-note">
            <i className="cal-dot period" aria-hidden /> {t("Pink: your periods. Water weight often goes up 0.5–2 kg in the days before and during a period, then comes off again.")}
          </p>
        )}
        <p className="row-sub" style={{ whiteSpace: "normal", marginTop: 8 }}>
          {trendText}
          {onTrack !== null && <> {onTrack ? t("That's on track for your goal.") : t("That's off pace for your goal — check your calories.")}</>}
        </p>
        <div className="field" style={{ padding: 0, marginTop: 8 }}>
          <label htmlFor="pg-weight">{t("Today")}</label>
          <input id="pg-weight" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} aria-label={t("Weight in kg")} style={{ width: 80 }} />
          <span className="muted">kg</span>
          <button className="btn small" onClick={saveWeight}>
            {t("Save")}
          </button>
        </div>
      </div>
      {weights.length > 0 && (
        <div className="group" style={{ marginTop: 10 }}>
          {weights
            .slice(-5)
            .reverse()
            .map((w) => (
              <div className="row" key={w.id}>
                <div className="row-main">
                  <div className="row-title tabular">{w.kg.toFixed(1)} kg</div>
                  <div className="row-sub">{new Date(`${w.date}T00:00`).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" })}</div>
                </div>
                <button className="icon-btn" aria-label={t("Delete weigh-in on {date}", { date: w.date })} onClick={() => actions.removeWeight(w.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
        </div>
      )}

      <BodySection />

      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Droplet size={14} /> {t("Water")}
        </span>
        <span className="muted tabular" style={{ textTransform: "none" }}>
          {t("Goal {l} L", { l: (waterGoal / 1000).toFixed(1) })}
        </span>
      </div>
      <div className="card">
        <DayBars label={t("Water")} unit="ml" color="var(--teal)" goal={waterGoal} days={week.map((date) => ({ date, value: statsFor(date)?.waterMl ?? 0 }))} />
        <WaterControl />
      </div>
      <p className="footnote">{t("Progress is saved on this phone.")}</p>
    </Sheet>
  );
}

const CUP_SIZES = [100, 150, 200, 250, 330, 350, 500, 600, 750, 1000];
const litres = (ml: number) => String(Math.round(ml / 10) / 100);

/** + / − one cup of water for today, with a cup size the person picks. Also used on the Today screen. */
export function WaterControl({ compact = false }: { compact?: boolean }) {
  useLanguage();
  const today = useTodayKey();
  const profile = useStore((s) => s.profile);
  const ml = useStore((s) => s.days.find((d) => d.id === today)?.waterMl ?? 0);
  const goal = waterGoalMl(profile);
  const cup = profile.waterServingMl || GLASS_ML;
  const [picking, setPicking] = useState(false);
  const add = (amount: number, undo = true) => {
    if (!amount) return;
    actions.updateDay(today, (d) => ({ ...d, waterMl: Math.max(0, d.waterMl + amount) }));
    haptic(amount > 0 ? "light" : "medium");
    const undoIt = undo ? { label: t("Undo"), run: () => add(-amount, false) } : undefined;
    if (amount > 0 && ml < goal && ml + amount >= goal) {
      haptic("success");
      showToast(t("Water goal reached · nice!"), undoIt);
    } else if (undo) {
      showToast(amount > 0 ? t("Added {ml} ml of water", { ml: amount }) : t("Removed {ml} ml of water", { ml: -amount }), undoIt);
    }
  };
  const takeBack = () => ml > 0 && add(-Math.min(cup, ml));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: compact ? 0 : 10 }} data-testid="water" data-tour={compact ? "water-cup" : undefined}>
      <WaterCup cup={cup} onDrink={() => add(cup)} onTakeBack={takeBack} />
      <div className="row-main">
        <div className="water-total tabular">
          {t("{l} of {goal} L water", { l: litres(ml), goal: litres(goal) })}
        </div>
        <div style={{ margin: "8px 0 6px" }}>
          <Bar value={ml} max={goal} color="var(--blue)" />
        </div>
        <button className="link tap water-cup" onClick={() => setPicking(true)} aria-label={t("Cup size {ml} ml, change", { ml: cup })}>
          {t("{ml} ml a cup", { ml: cup })} · {t("Change")}
        </button>
        <div className="tile-sub" style={{ whiteSpace: "normal" }}>
          {t("Tap the cup to drink · hold it to take a cup back")}
        </div>
        {/* For keyboards and screen readers: holding isn't possible there. */}
        <button className="sr-only focus-show link" onClick={takeBack} disabled={ml <= 0}>
          {t("Remove {ml} ml of water", { ml: Math.min(cup, ml) || cup })}
        </button>
      </div>
      <CupSheet open={picking} onClose={() => setPicking(false)} cup={cup} onAddOnce={(n) => add(n, false)} />
    </div>
  );
}

/**
 * A cup of water to tap: the water drains away as the cup is counted, then the cup fills back up
 * for the next one. Hold it to take a cup back.
 */
function WaterCup({ cup, onDrink, onTakeBack }: { cup: number; onDrink: () => void; onTakeBack: () => void }) {
  const reduce = useReducedMotion();
  const clip = `cup-${useId().replace(/:/g, "")}`;
  // 1 = full, 0 = empty.
  const level = useMotionValue(1);
  const y = useTransform(level, (v) => 14 + (1 - v) * 66);
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  useEffect(() => () => clearTimeout(hold.current), []);

  const drink = () => {
    onDrink();
    if (reduce) return;
    level.stop();
    // Drink it down, then fill the cup back up.
    void animate(level, [level.get(), 0, 0, 1], { duration: 1.5, times: [0, 0.45, 0.55, 1], ease: ["easeIn", "linear", "easeOut"] });
  };
  return (
    <button
      className="water-cup-btn"
      aria-label={t("Add {ml} ml of water", { ml: cup })}
      onClick={() => {
        if (held.current) {
          held.current = false;
          return;
        }
        drink();
      }}
      onPointerDown={() => {
        clearTimeout(hold.current);
        hold.current = setTimeout(() => {
          held.current = true;
          onTakeBack();
        }, 550);
      }}
      onPointerUp={() => clearTimeout(hold.current)}
      onPointerLeave={() => clearTimeout(hold.current)}
      onPointerCancel={() => clearTimeout(hold.current)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg width="64" height="80" viewBox="0 0 64 88" aria-hidden>
        <defs>
          <clipPath id={clip}>
            <path d="M10 8 H54 L49 80 Q48.5 84 45 84 H19 Q15.5 84 15 80 Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <motion.g style={{ y }}>
            {/* A gentle wave on the water's surface. */}
            <g className={reduce ? undefined : "water-wave"}>
              <path d="M-64 6 Q-56 0 -48 6 T-32 6 T-16 6 T0 6 T16 6 T32 6 T48 6 T64 6 T80 6 T96 6 T112 6 T128 6 V120 H-64 Z" fill="var(--water)" />
            </g>
          </motion.g>
        </g>
        <path d="M10 8 H54 L49 80 Q48.5 84 45 84 H19 Q15.5 84 15 80 Z" fill="none" stroke="var(--water-glass)" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M18 18 L21 70" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** Pick the usual cup or bottle size, or add a one-off amount. */
function CupSheet({ open, onClose, cup, onAddOnce }: { open: boolean; onClose: () => void; cup: number; onAddOnce: (ml: number) => void }) {
  useLanguage();
  const [custom, setCustom] = useState(0);
  const valid = custom >= 20 && custom <= 3000;
  const choose = (ml: number) => {
    haptic("light");
    actions.updateProfile({ waterServingMl: ml });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("Cup size")}>
      <p className="footnote" style={{ margin: "0 0 12px" }}>
        {t("Each tap on the cup adds this much water. Pick the cup or bottle you usually drink from.")}
      </p>
      <div className="cup-grid" role="group" aria-label={t("Cup size")}>
        {CUP_SIZES.map((ml) => (
          <button key={ml} className={`chip${ml === cup ? " active" : ""}`} aria-pressed={ml === cup} onClick={() => choose(ml)}>
            {ml >= 1000 ? `${litres(ml)} L` : `${ml} ml`}
          </button>
        ))}
      </div>
      <div className="group" style={{ marginTop: 18 }}>
        <div className="field">
          <label htmlFor="cup-ml">{t("Other amount")}</label>
          <NumberInput id="cup-ml" integer max={3000} value={custom} onChange={setCustom} placeholder="330" />
          <span className="muted" style={{ width: 28 }}>
            ml
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button className="btn secondary" style={{ flex: 1 }} disabled={!valid} onClick={() => choose(custom)}>
          {t("Use as cup size")}
        </button>
        <button
          className="btn primary"
          style={{ flex: 1 }}
          disabled={!valid}
          onClick={() => {
            onAddOnce(custom);
            showToast(t("Added {ml} ml of water", { ml: custom }));
            onClose();
          }}
        >
          {t("Add once")}
        </button>
      </div>
    </Sheet>
  );
}
