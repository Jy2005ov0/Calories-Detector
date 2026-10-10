import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { averageLength, cycleOf, cycleStatus, periodDays, periodLength, predictedDays, togglePeriodDay } from "../lib/cycle";
import { actions, useStore, useTodayKey } from "../lib/store";
import { Sheet, haptic } from "./ui";

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A month of days, Monday first, padded to whole weeks. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Tap the days of each period, past ones included; the next period is predicted from them. */
export function CycleCalendar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const today = useTodayKey();
  const [shown, setShown] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const settings = cycleOf(profile);
  const status = cycleStatus({ ...settings, on: true }, periods, today);
  const marked = useMemo(() => periodDays(periods, settings, today), [periods, settings, today]);
  const predicted = useMemo(() => predictedDays(status, periods, settings), [status, periods, settings]);
  const cells = monthGrid(shown.y, shown.m);
  const now = new Date();
  const monthsAhead = (shown.y - now.getFullYear()) * 12 + (shown.m - now.getMonth());
  const move = (by: number) => setShown(({ y, m }) => ({ y: y + Math.floor((m + by) / 12), m: (((m + by) % 12) + 12) % 12 }));
  const weekdays = [...Array(7)].map((_, i) => new Date(2026, 9, 12 + i).toLocaleDateString(locale(), { weekday: "narrow" }));
  const learnedCycle = averageLength(periods, 0);
  const learnedPeriod = periodLength(periods, 0);

  return (
    <Sheet open={open} onClose={onClose} title={t("Period calendar")}>
      <p className="footnote" style={{ margin: "0 0 12px" }}>
        {t("Tap the days you had your period. Tap again to remove a day.")}
      </p>
      <div className="card cal" data-testid="cycle-calendar">
        <div className="cal-head">
          <button className="icon-btn" onClick={() => move(-1)} aria-label={t("Previous month")}>
            <ChevronLeft size={18} />
          </button>
          <strong aria-live="polite">{new Date(shown.y, shown.m, 1).toLocaleDateString(locale(), { month: "long", year: "numeric" })}</strong>
          <button className="icon-btn" onClick={() => move(1)} aria-label={t("Next month")} disabled={monthsAhead >= 2}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="cal-grid" role="group" aria-label={t("Period calendar")}>
          {weekdays.map((w, i) => (
            <span key={`w${i}`} className="cal-weekday" aria-hidden>
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const k = key(d);
            const isPeriod = marked.has(k);
            const isPredicted = !isPeriod && predicted.has(k);
            const future = k > today;
            const label = d.toLocaleDateString(locale(), { day: "numeric", month: "long" });
            return (
              <button
                key={k}
                className={`cal-day${isPeriod ? " period" : ""}${isPredicted ? " predicted" : ""}${k === today ? " today" : ""}`}
                disabled={future}
                aria-pressed={isPeriod}
                aria-label={isPeriod ? t("{date}: period day", { date: label }) : isPredicted ? t("{date}: predicted period", { date: label }) : label}
                onClick={() => {
                  haptic("light");
                  actions.setPeriods(togglePeriodDay(periods, k, settings, today));
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <div className="cal-legend" aria-hidden>
          <span>
            <i className="cal-dot period" /> {t("Period")}
          </span>
          <span>
            <i className="cal-dot predicted" /> {t("Predicted")}
          </span>
          <span>
            <i className="cal-dot today" /> {t("Today")}
          </span>
        </div>
      </div>
      <p className="footnote">
        {learnedCycle || learnedPeriod
          ? t("Your cycles average {cycle} days and periods {period} days, from the days you've marked.", { cycle: learnedCycle || settings.length, period: learnedPeriod || settings.periodDays })
          : t("Mark a few periods and predictions will follow your own cycle.")}
      </p>
    </Sheet>
  );
}
