import { useState } from "react";
import { locale, t, useLanguage } from "../i18n";
import type { WeightEntry } from "../lib/types";

const shortDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "numeric", month: "short" });
};

/** Weight over time: one thin line, recessive grid, last point marked; tap a point to read it. */
export function WeightChart({ weights, goalKg }: { weights: WeightEntry[]; goalKg?: number }) {
  useLanguage();
  const [sel, setSel] = useState<number | null>(null);
  const pts = weights.slice(-60);
  if (pts.length < 2) return null;
  const W = 320;
  const H = 150;
  const pad = { l: 34, r: 10, t: 12, b: 22 };
  const ys = pts.map((p) => p.kg).concat(goalKg ? [goalKg] : []);
  const lo = Math.floor(Math.min(...ys) - 0.5);
  const hi = Math.ceil(Math.max(...ys) + 0.5);
  const t0 = Date.parse(pts[0].date);
  const t1 = Math.max(Date.parse(pts[pts.length - 1].date), t0 + 86400000);
  const x = (d: string) => pad.l + ((Date.parse(d) - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (kg: number) => pad.t + ((hi - kg) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  // The tapped point may be gone after a weigh-in is deleted.
  const shown = pts[Math.min(sel ?? Infinity, pts.length - 1)];
  const first = pts[0];
  const last = pts[pts.length - 1];

  return (
    <figure className="chart" style={{ margin: 0 }}>
      <div className="chart-readout" aria-live="polite">
        <strong className="tabular">{shown.kg.toFixed(1)} kg</strong> <span className="muted">· {shortDate(shown.date)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={t("Weight from {from} kg on {d1} to {to} kg on {d2}", { from: first.kg.toFixed(1), d1: shortDate(first.date), to: last.kg.toFixed(1), d2: shortDate(last.date) })}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--separator)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" className="chart-axis">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        {goalKg && goalKg >= lo && goalKg <= hi && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(goalKg)} y2={y(goalKg)} stroke="var(--label-3)" strokeDasharray="4 4" strokeWidth={1} />
            <text x={W - pad.r} y={y(goalKg) - 4} textAnchor="end" className="chart-axis">
              {t("Goal")}
            </text>
          </g>
        )}
        <text x={pad.l} y={H - 6} className="chart-axis">
          {shortDate(first.date)}
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="chart-axis">
          {shortDate(last.date)}
        </text>
        <path d={path} fill="none" stroke="var(--blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          // Big invisible hit areas so a finger can pick a point.
          <circle key={p.id} cx={x(p.date)} cy={y(p.kg)} r={12} fill="transparent" onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
            <title>{`${p.kg.toFixed(1)} kg · ${shortDate(p.date)}`}</title>
          </circle>
        ))}
        <circle cx={x(shown.date)} cy={y(shown.kg)} r={4.5} fill="var(--blue)" stroke="var(--bg-elev)" strokeWidth={2} pointerEvents="none" />
      </svg>
    </figure>
  );
}

/** Seven days of one measure as bars, with the goal as a dashed line. Tap a bar to read it. */
export function DayBars({ days, goal, color, unit, label }: { days: { date: string; value: number }[]; goal: number; color: string; unit: string; label: string }) {
  useLanguage();
  const [sel, setSel] = useState<number | null>(null);
  const W = 320;
  const H = 120;
  const pad = { l: 6, r: 6, t: 10, b: 20 };
  const max = Math.max(goal * 1.15, ...days.map((d) => d.value), 1);
  const bw = (W - pad.l - pad.r) / days.length;
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const shown = days[sel ?? days.length - 1];
  const weekday = (key: string) => {
    const [yy, m, d] = key.split("-").map(Number);
    return new Date(yy, m - 1, d).toLocaleDateString(locale(), { weekday: "narrow" });
  };
  return (
    <figure className="chart" style={{ margin: 0 }}>
      <div className="chart-readout" aria-live="polite">
        <strong className="tabular">
          {Math.round(shown.value).toLocaleString(locale())} {unit}
        </strong>{" "}
        <span className="muted">· {shortDate(shown.date)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${label}: ${days.map((d) => `${shortDate(d.date)} ${Math.round(d.value)} ${unit}`).join(", ")}`}>
        <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--label-3)" strokeDasharray="4 4" strokeWidth={1} />
        {days.map((d, i) => {
          const h = Math.max(0, H - pad.b - y(d.value));
          const bx = pad.l + i * bw + 5;
          const w = bw - 10;
          return (
            <g key={d.date} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {h > 0 && <path d={roundedTop(bx, H - pad.b - h, w, h, Math.min(4, h))} fill={color} opacity={sel === null || sel === i ? 1 : 0.45} />}
              <text x={bx + w / 2} y={H - 5} textAnchor="middle" className="chart-axis">
                {weekday(d.date)}
              </text>
              <title>{`${shortDate(d.date)}: ${Math.round(d.value)} ${unit}`}</title>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
