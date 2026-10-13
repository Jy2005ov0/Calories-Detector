import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Moon, Sun } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { haptic } from "./ui";

const DAY = 24 * 60;
const STEP = 5;

/** "23:30" → minutes after midnight. */
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return ((h || 0) * 60 + (m || 0)) % DAY;
};
export const toHHMM = (min: number) => {
  const m = ((Math.round(min) % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
/** Minutes asleep from bedtime to waking (past midnight if need be). */
export const sleepMinutes = (bed: string, wake: string) => (toMinutes(wake) - toMinutes(bed) + DAY) % DAY;
/** A time of day in the app's language: "11:30 pm", "23:30", "晚上11:30". */
export const clockLabel = (hhmm: string) => {
  const m = toMinutes(hhmm);
  return new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
};
/** "7 h 45 min". */
export const durationLabel = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? t("{h} h {m} min", { h, m }) : t("{h} h", { h });
};

const SIZE = 236;
const C = SIZE / 2;
const R = 90;
const TRACK = 30;

/** Where a time sits on the 24-hour dial: midnight at the top, noon at the bottom. */
function point(min: number, r = R) {
  const a = (min / DAY) * 2 * Math.PI;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

/**
 * Bedtime and wake-up on a 24-hour clock face. Drag the moon and the sun around the dial;
 * the hours asleep show in the middle. Arrow keys move a handle 5 minutes (Page Up/Down an hour).
 */
export function SleepClock({ bed, wake, onChange }: { bed: string; wake: string; onChange: (bed: string, wake: string) => void }) {
  useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef<"bed" | "wake" | null>(null);
  const bedMin = toMinutes(bed);
  const wakeMin = toMinutes(wake);
  const asleep = sleepMinutes(bed, wake);

  const set = (which: "bed" | "wake", min: number) => {
    const v = toHHMM(Math.round(min / STEP) * STEP);
    if (v === (which === "bed" ? bed : wake)) return;
    // A light tick every hour while dragging.
    if (toMinutes(v) % 60 === 0) haptic("light");
    if (which === "bed") onChange(v, wake);
    else onChange(bed, v);
  };
  const fromPointer = (e: PointerEvent) => {
    const box = ref.current!.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
    return turn * DAY;
  };
  const handle = (which: "bed" | "wake") => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      dragging.current = which;
      haptic("light");
    },
    onPointerMove: (e: PointerEvent) => {
      if (dragging.current === which) set(which, fromPointer(e));
    },
    onPointerUp: () => (dragging.current = null),
    onPointerCancel: () => (dragging.current = null),
    onKeyDown: (e: KeyboardEvent) => {
      const step = { ArrowUp: STEP, ArrowRight: STEP, ArrowDown: -STEP, ArrowLeft: -STEP, PageUp: 60, PageDown: -60 }[e.key];
      if (!step) return;
      e.preventDefault();
      set(which, (which === "bed" ? bedMin : wakeMin) + step);
    },
  });

  // The asleep part of the dial, clockwise from bedtime to waking.
  const a = point(bedMin);
  const b = point(wakeMin);
  const arc = asleep === 0 ? "" : `M ${a.x} ${a.y} A ${R} ${R} 0 ${asleep > DAY / 2 ? 1 : 0} 1 ${b.x} ${b.y}`;
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="sleep-clock" ref={ref} style={{ width: SIZE, height: SIZE }} data-testid="sleep-clock">
      <svg width={SIZE} height={SIZE} aria-hidden>
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--bg-fill)" strokeWidth={TRACK} />
        {hours.map((h) => {
          const outer = point(h * 60, R - TRACK / 2 - 4);
          const inner = point(h * 60, R - TRACK / 2 - (h % 6 ? 8 : 13));
          return <line key={h} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="var(--label-3)" strokeWidth={h % 6 ? 1 : 2} strokeLinecap="round" />;
        })}
        {[0, 6, 12, 18].map((h) => {
          const p = point(h * 60, R - TRACK / 2 - 25);
          return (
            <text key={h} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="sleep-hour">
              {new Date(2000, 0, 1, h).toLocaleTimeString(locale(), { hour: "numeric" })}
            </text>
          );
        })}
        {arc && <path d={arc} fill="none" stroke="var(--indigo)" strokeWidth={TRACK - 6} strokeLinecap="round" opacity={0.9} />}
      </svg>
      <div className="sleep-center">
        <div className="sleep-total tabular">{durationLabel(asleep)}</div>
        <div className="stat-label" style={{ justifyContent: "center" }}>
          {t("asleep")}
        </div>
      </div>
      {(["bed", "wake"] as const).map((which) => {
        const min = which === "bed" ? bedMin : wakeMin;
        const p = point(min);
        const label = which === "bed" ? t("Bedtime") : t("Wake up");
        return (
          <div
            key={which}
            role="slider"
            tabIndex={0}
            className={`sleep-handle ${which}`}
            style={{ left: p.x, top: p.y }}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={DAY - STEP}
            aria-valuenow={min}
            aria-valuetext={`${label} ${clockLabel(which === "bed" ? bed : wake)}`}
            {...handle(which)}
          >
            {which === "bed" ? <Moon size={16} /> : <Sun size={16} />}
          </div>
        );
      })}
    </div>
  );
}
