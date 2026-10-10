import { useEffect, useMemo, useState } from "react";
import { Droplet, Minus, Plus, Trash2 } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { round } from "../lib/nutrition";
import { GLASS_ML, addDays, logStreak, waterGoalMl, weightTrend, workoutWeekStreak } from "../lib/progress";
import { bmiBand } from "../lib/recommend";
import { actions, useStore, useTodayKey } from "../lib/store";
import { DayBars, WeightChart } from "./Charts";
import { NumberInput, Sheet, haptic, showToast } from "./ui";

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
  const today = useTodayKey();
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
          <WeightChart weights={weights} goalKg={goalKg} />
        ) : (
          <p className="row-sub" style={{ whiteSpace: "normal", margin: 0 }}>
            {t("Log your weight to start your chart. Weigh yourself at the same time of day, ideally in the morning.")}
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
  const add = (amount: number) => {
    actions.updateDay(today, (d) => ({ ...d, waterMl: Math.max(0, d.waterMl + amount) }));
    if (amount > 0) haptic("light");
    if (amount > 0 && ml < goal && ml + amount >= goal) {
      haptic("success");
      showToast(t("Water goal reached · nice!"));
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: compact ? 0 : 10 }}>
      <div className="row-main">
        <div style={{ fontWeight: 600 }} className="tabular">
          {t("{l} of {goal} L water", { l: litres(ml), goal: litres(goal) })}
        </div>
        <button className="link tap water-cup" onClick={() => setPicking(true)} aria-label={t("Cup size {ml} ml, change", { ml: cup })}>
          {t("{ml} ml a cup", { ml: cup })} · {t("Change")}
        </button>
      </div>
      <button className="round-btn" aria-label={t("Remove {ml} ml of water", { ml: Math.min(cup, ml) || cup })} onClick={() => add(-Math.min(cup, ml))} disabled={ml <= 0}>
        <Minus size={16} />
      </button>
      <button className="round-btn primary" aria-label={t("Add {ml} ml of water", { ml: cup })} onClick={() => add(cup)}>
        <Plus size={16} />
      </button>
      <CupSheet open={picking} onClose={() => setPicking(false)} cup={cup} onAddOnce={add} />
    </div>
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
        {t("Each tap on + adds this much water. Pick the cup or bottle you usually drink from.")}
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
