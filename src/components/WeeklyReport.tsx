import { useMemo } from "react";
import { CalendarRange, Lightbulb, Moon } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { round, targets } from "../lib/nutrition";
import { waterGoalMl } from "../lib/progress";
import { sleepInsight, weeklyReport, type Tip } from "../lib/report";
import { useStore, useTodayKey } from "../lib/store";
import { Bar, Sheet } from "./ui";

const TIPS: Record<Tip, () => string> = {
  logMore: () => t("Log at least 3 days a week so the report can spot patterns. Copying yesterday's meals makes it quick."),
  over: () => t("You averaged above your calorie target. Swap one sugary drink or fried side a day for something lighter."),
  under: () => t("You ate well under your target. Eating too little stalls progress and drains energy: add a proper snack."),
  protein: () => t("Protein was short of your target. Add an egg, tofu, chicken or Greek yogurt to two meals a day."),
  sugar: () => t("Sugar ran high. Try kopi or teh kurang manis, or kosong, and fruit instead of kuih."),
  sodium: () => t("Sodium was high. Go easy on soy sauce, instant noodles and kuah; drink more water."),
  fibre: () => t("Fibre was low. Add vegetables or fruit to lunch and dinner, and choose brown rice or wholemeal bread."),
  water: () => t("You drank less water than your goal. Keep a bottle with you and add a glass with each meal."),
  great: () => t("A balanced week: calories, protein and limits on track. Keep it going!"),
};

const dayName = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "short" });
};

/** The last seven days against your targets, the best and toughest day, and one thing to try next week. */
export function WeeklyReportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const today = useTodayKey();
  const profile = useStore((s) => s.profile);
  const log = useStore((s) => s.log);
  const days = useStore((s) => s.days);
  const sessions = useStore((s) => s.sessions);
  const tg = targets(profile);
  const r = useMemo(() => weeklyReport(log, days, sessions, tg, today, waterGoalMl(profile)), [log, days, sessions, today, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const sleep = useMemo(() => sleepInsight(days, sessions), [days, sessions]);
  const rows = r.avg
    ? [
        { k: t("Calories"), v: r.avg.kcal, goal: tg.kcal, unit: "kcal", color: "var(--orange)", limit: false },
        { k: t("Protein"), v: r.avg.protein, goal: tg.protein, unit: "g", color: "var(--pink)", limit: false },
        { k: t("Fibre"), v: r.avg.fiber, goal: tg.fiber, unit: "g", color: "var(--green)", limit: false },
        { k: t("Sugar"), v: r.avg.sugar, goal: tg.sugarMax, unit: "g", color: "var(--purple)", limit: true },
        { k: t("Sodium"), v: r.avg.sodium, goal: tg.sodiumMax, unit: "mg", color: "var(--teal)", limit: true },
      ]
    : [];
  return (
    <Sheet open={open} onClose={onClose} title={t("Weekly report")}>
      <p className="subtitle" style={{ marginTop: 0 }}>
        {t("{from} – {to} · {n} of 7 days logged", { from: dayName(r.from), to: dayName(r.to), n: r.daysLogged })}
      </p>
      <div className="card tip-card" data-testid="report-tip">
        <Lightbulb size={18} color="var(--yellow)" />
        <div>
          <div className="tile-title">{t("Next week")}</div>
          <div className="row-sub" style={{ whiteSpace: "normal" }}>
            {TIPS[r.tip]()}
          </div>
        </div>
      </div>
      {r.avg && (
        <>
          <div className="section-header">{t("Daily average")}</div>
          <div className="card">
            {rows.map((x, i) => (
              <div key={x.k} style={{ marginTop: i ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 6 }}>
                  <span>{x.k}</span>
                  <span className="muted tabular">
                    {round(x.v)} / {x.goal} {x.unit}
                    {x.limit ? ` ${t("max")}` : ""}
                  </span>
                </div>
                <Bar value={x.v} max={x.goal} color={x.color} />
              </div>
            ))}
          </div>
        </>
      )}
      {r.best && r.worst && (
        <div className="group" style={{ marginTop: 12 }}>
          <div className="row">
            <div className="row-main">
              <div className="row-sub">{t("Best day")}</div>
              <div className="row-title">{dayName(r.best.date)}</div>
            </div>
            <span className="row-value">{round(r.best.n.kcal)} kcal</span>
          </div>
          <div className="row">
            <div className="row-main">
              <div className="row-sub">{t("Toughest day")}</div>
              <div className="row-title">{dayName(r.worst.date)}</div>
            </div>
            <span className="row-value">{round(r.worst.n.kcal)} kcal</span>
          </div>
        </div>
      )}
      <div className="section-header">{t("Activity")}</div>
      <div className="group">
        <div className="row">
          <CalendarRange size={16} />
          <div className="row-main">{t("Workouts")}</div>
          <span className="row-value">{t("{n} · {min} min", { n: r.workouts, min: r.workoutMinutes })}</span>
        </div>
        {r.avgSteps !== null && (
          <div className="row">
            <div className="row-main">{t("Steps a day")}</div>
            <span className="row-value">{r.avgSteps.toLocaleString()}</span>
          </div>
        )}
        {r.avgWaterMl !== null && (
          <div className="row">
            <div className="row-main">{t("Water a day")}</div>
            <span className="row-value">{(r.avgWaterMl / 1000).toFixed(1)} L</span>
          </div>
        )}
        {r.avgSleepH !== null && (
          <div className="row">
            <div className="row-main">{t("Sleep a night")}</div>
            <span className="row-value">{r.avgSleepH} h</span>
          </div>
        )}
      </div>
      <div className="section-header">{t("Sleep and training")}</div>
      <div className="card tip-card" data-testid="sleep-insight">
        <Moon size={18} color="var(--indigo)" />
        <div className="row-sub" style={{ whiteSpace: "normal" }}>
          {sleep
            ? t("After 7+ hours of sleep you trained {a} min a day and rated your energy {ea}; after less sleep, {b} min and {eb}.", {
                a: sleep.trainRested,
                b: sleep.trainShort,
                ea: sleep.energyRested ?? "–",
                eb: sleep.energyShort ?? "–",
              })
            : t("Do the morning check-in for a couple of weeks and W will show how your sleep affects your energy and training.")}
        </div>
      </div>
    </Sheet>
  );
}
