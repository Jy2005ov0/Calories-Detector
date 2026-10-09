import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type InputHTMLAttributes, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Minus, Plus, ThumbsUp, TriangleAlert, X } from "lucide-react";
import type { Grade, HealthReport, Suitability } from "../lib/nutrition";
import type { Nutrients } from "../lib/types";
import { round } from "../lib/nutrition";
import { haptic, pushBackHandler } from "../lib/platform";
import { t, useLanguage } from "../i18n";

// Apple's defaults translated to Motion springs: critically damped for UI, a touch of
// bounce only after a gesture that carried momentum.
export const SPRING = { type: "spring", bounce: 0, duration: 0.4 } as const;
export const SPRING_SNAPPY = { type: "spring", bounce: 0, duration: 0.3 } as const;
export const SPRING_MOMENTUM = { type: "spring", bounce: 0.2, duration: 0.3 } as const;

/** Apple's momentum projection (from "Designing Fluid Interfaces"). */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export { haptic };

// ── Number input ────────────────────────────────────────

const parseNum = (s: string) => parseFloat(s.replace(",", "."));

/**
 * A number box that keeps what's typed ("22.", "0,5", "") while only reporting finished,
 * valid numbers. Typing 22.5 no longer turns into 225, and clearing the box doesn't save 0
 * unless `emptyValue` says so.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  integer = false,
  emptyValue,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  /** Reported when the box is cleared; leave unset to keep the last good value instead. */
  emptyValue?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max">) {
  const show = (v: number) => (v ? String(v) : "");
  const [text, setText] = useState(show(value));
  // Follow changes made elsewhere (a stepper, a pre-filled suggestion) unless they match what's typed.
  useEffect(() => {
    if (parseNum(text) !== value && !(text === "" && !value)) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      inputMode={integer ? "numeric" : "decimal"}
      {...rest}
      value={text}
      onChange={(e) => {
        const s = e.target.value.replace(integer ? /[^\d]/g : /[^\d.,]/g, "");
        setText(s);
        if (s === "") {
          if (emptyValue !== undefined) onChange(emptyValue);
          return;
        }
        const n = integer ? Math.round(parseNum(s)) : parseNum(s);
        if (!Number.isFinite(n)) return;
        // Too big snaps to the limit; too small may just be half-typed ("1" on the way to "18").
        if (n > max) {
          setText(String(max));
          onChange(max);
        } else if (n >= min) onChange(n);
      }}
      onBlur={(e) => {
        const n = parseNum(text);
        if (!(text === "" && emptyValue !== undefined) && !(Number.isFinite(n) && n >= min && n <= max)) setText(show(value));
        rest.onBlur?.(e);
      }}
    />
  );
}

// ── Sheet ───────────────────────────────────────────────

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  /** Open at full height, so a sheet stacked on another never lets the one below peek out above it. */
  full?: boolean;
}

export function Sheet({ open, onClose, title, left, right, children, full }: SheetProps) {
  useLanguage();
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  // Register once per opening (not per render) so nested sheets keep their stacking order.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    return pushBackHandler(() => closeRef.current());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            className={full ? "sheet full" : "sheet"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            // A closing sheet still shows its buttons; a second tap must not log twice.
            exit={reduce ? { opacity: 0, pointerEvents: "none" } : { y: "100%", pointerEvents: "none" }}
            transition={SPRING}
            drag={reduce ? false : "y"}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 1 }}
            dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
            onDragEnd={(_, info) => {
              const h = ref.current?.offsetHeight ?? 600;
              // Decide from where the flick is *going*, not where the finger let go.
              const projected = info.offset.y + project(info.velocity.y);
              if (projected > h * 0.45 || info.velocity.y > 900) onClose();
            }}
          >
            <div className="sheet-drag" onPointerDown={(e) => controls.start(e)} style={{ touchAction: "none" }}>
              <div className="sheet-grabber" />
              <div className="sheet-header">
                <div className="side">{left}</div>
                <h3 id={titleId}>{title}</h3>
                <div className="side">
                  {right ?? (
                    <button className="icon-btn" onClick={onClose} aria-label={t("Close")}>
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Segmented control ───────────────────────────────────

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  /** label can be an icon; then give it an ariaLabel. */
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`segmented ${className ?? ""}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} aria-label={o.ariaLabel} title={o.ariaLabel} onClick={() => onChange(o.value)}>
          {o.value === value && <motion.div layoutId={`seg-${id}`} className="thumb" transition={SPRING_SNAPPY} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Rings & bars ────────────────────────────────────────

export function Ring({
  progress,
  size = 140,
  stroke = 14,
  color = "var(--orange)",
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const p = Math.max(0, Math.min(1, progress));
  const over = progress > 1;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-fill)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--red)" : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: p }}
          transition={{ type: "spring", bounce: 0, duration: 0.9 }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="bar">
      <motion.div
        style={{ background: value > max * 1.05 ? "var(--red)" : color }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: p }}
        transition={{ type: "spring", bounce: 0, duration: 0.7 }}
      />
    </div>
  );
}

export function MacroBars({ n, t: goal }: { n: Nutrients; t?: { protein: number; carbs: number; fat: number } }) {
  useLanguage();
  const items = [
    { k: "Protein", v: n.protein, max: goal?.protein, color: "var(--protein)" },
    { k: "Carbs", v: n.carbs, max: goal?.carbs, color: "var(--carbs)" },
    { k: "Fat", v: n.fat, max: goal?.fat, color: "var(--fat)" },
  ];
  return (
    <div className="macro-row">
      {items.map((m) => (
        <div key={m.k} className="stat">
          <span className="stat-label">
            <span className="dot" style={{ background: m.color }} />
            {t(m.k)}
          </span>
          <span className="stat-value" style={{ fontSize: "1.0625rem" }}>
            {round(m.v)}
            <small>{m.max ? `/ ${m.max} g` : "g"}</small>
          </span>
          {m.max ? <Bar value={m.v} max={m.max} color={m.color} /> : null}
        </div>
      ))}
    </div>
  );
}

// ── Stepper ─────────────────────────────────────────────

export function Stepper({
  value,
  onChange,
  step = 1,
  decrementStep = step,
  min = 0,
  max = 9999,
  format,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  decrementStep?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  /** What is being counted, so screen readers hear "More sambal" rather than "Increase". */
  label?: string;
}) {
  useLanguage();
  return (
    <div className="stepper">
      <button aria-label={label ? t("Less {x}", { x: label }) : t("Decrease")} onClick={() => onChange(Math.max(min, round(value - decrementStep, 2)))}>
        <Minus size={16} />
      </button>
      <span>{format ? format(value) : value}</span>
      <button aria-label={label ? t("More {x}", { x: label }) : t("Increase")} onClick={() => onChange(Math.min(max, round(value + step, 2)))}>
        <Plus size={16} />
      </button>
    </div>
  );
}

// ── Health & suitability ────────────────────────────────

export const GRADE_COLORS: Record<Grade, string> = {
  A: "#13803f",
  B: "#7cb342",
  C: "#f5b400",
  D: "#f57c00",
  E: "#c62828",
};
/** Letter colour per grade, chosen for ≥ 4.5:1 contrast on its background. */
export const GRADE_TEXT: Record<Grade, string> = { A: "#fff", B: "#1d1d1f", C: "#1d1d1f", D: "#1d1d1f", E: "#fff" };

export function HealthCard({ report }: { report: HealthReport }) {
  useLanguage();
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div className="grade" style={{ background: GRADE_COLORS[report.grade], color: GRADE_TEXT[report.grade] }}>
          {report.grade}
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{t("Health score {score}/100", { score: report.score })}</div>
          <div className="row-sub" style={{ whiteSpace: "normal" }}>
            {t("Based on protein, fibre, sugar, saturated fat and sodium per calorie")}
          </div>
        </div>
      </div>
      {(report.positives.length > 0 || report.negatives.length > 0) && (
        <div className="pill-list">
          {report.positives.map((p) => (
            <span key={p} className="badge" style={{ color: "var(--green-ink)" }}>
              <CircleCheck size={12} /> {p}
            </span>
          ))}
          {report.negatives.map((p) => (
            <span key={p} className="badge" style={{ color: "var(--red)" }}>
              <CircleAlert size={12} /> {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const VERDICT_STYLE = {
  great: { color: "var(--green-ink)", Icon: ThumbsUp },
  ok: { color: "var(--blue)", Icon: CircleCheck },
  caution: { color: "var(--orange-ink)", Icon: TriangleAlert },
  avoid: { color: "var(--red)", Icon: CircleAlert },
} as const;

export function SuitabilityCard({ s }: { s: Suitability }) {
  useLanguage();
  const { color, Icon } = VERDICT_STYLE[s.verdict];
  return (
    <div className="verdict" style={{ background: `color-mix(in srgb, ${color} 12%, var(--bg-elev))` }}>
      <h4 style={{ color }}>
        <Icon size={18} /> {s.headline}
      </h4>
      {s.reasons.length > 0 && (
        <ul>
          {s.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NutritionTable({ n }: { n: Nutrients }) {
  useLanguage();
  const rows: [string, string][] = [
    ["Calories", `${round(n.kcal)} kcal`],
    ["Protein", `${round(n.protein, 1)} g`],
    ["Carbohydrate", `${round(n.carbs, 1)} g`],
    ["   of which sugar", `${round(n.sugar, 1)} g`],
    ["   Fibre", `${round(n.fiber, 1)} g`],
    ["Fat", `${round(n.fat, 1)} g`],
    ["   of which saturated", `${round(n.satFat, 1)} g`],
    ["Sodium", `${round(n.sodium)} mg`],
  ];
  return (
    <div className="group">
      {rows.map(([k, v]) => (
        <div className="row" key={k} style={{ minHeight: 40, paddingBlock: 8 }}>
          <div className="row-main" style={{ whiteSpace: "pre", color: k.startsWith(" ") ? "var(--label-2)" : undefined }}>
            {k.startsWith(" ") ? `   ${t(k.trim())}` : t(k)}
          </div>
          <div className="row-value">{v}</div>
        </div>
      ))}
    </div>
  );
}

// ── Toast with undo ─────────────────────────────────────

interface ToastData {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}
let toast: ToastData | null = null;
const toastListeners = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string, action?: ToastData["action"]) {
  toast = { id: Date.now(), message, action };
  toastListeners.forEach((l) => l());
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast = null;
    toastListeners.forEach((l) => l());
  }, 4000);
}

export function ToastHost() {
  useLanguage();
  const current = useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toast,
  );
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          className="toast"
          role="status"
          initial={reduce ? { opacity: 0, x: "-50%" } : { opacity: 0, y: 20, scale: 0.96, x: "-50%", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%", filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0, x: "-50%" } : { opacity: 0, y: 20, scale: 0.96, x: "-50%", filter: "blur(6px)" }}
          transition={SPRING_SNAPPY}
        >
          <span>{current.message}</span>
          {current.action && (
            <button
              className="link bold"
              onClick={() => {
                current.action!.run();
                toast = null;
                toastListeners.forEach((l) => l());
              }}
            >
              {current.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Small helpers ───────────────────────────────────────

export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
  return now;
}

export function Empty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      {children}
    </div>
  );
}

/** iOS-style on/off switch. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? "on" : ""}`}
      onClick={() => {
        haptic("light");
        onChange(!checked);
      }}
    >
      <span className="knob" />
    </button>
  );
}

/** Red warning when a food clashes with the person's allergies, halal or vegetarian diet. */
export function AvoidCard({ conflicts }: { conflicts: { kind: string; text: string }[] }) {
  useLanguage();
  if (!conflicts.length) return null;
  return (
    <div className="avoid-card" role="alert">
      <TriangleAlert size={18} style={{ flex: "none", marginTop: 1 }} />
      <div>
        {conflicts.map((c) => (
          <div key={c.text} style={{ fontWeight: 600 }}>
            {c.text}
          </div>
        ))}
        <div className="avoid-note">{t("Based on how it's usually made. Check with the seller.")}</div>
      </div>
    </div>
  );
}

/**
 * Long lists (hundreds of exercises or foods) render a page at a time; the next page is added
 * when the end of the list scrolls into view, so opening a list and typing in search stay fast.
 */
export function useShowMore<T>(list: T[], page = 60): [T[], ReactNode] {
  const [count, setCount] = useState(page);
  const sentinel = useRef<HTMLDivElement>(null);
  // Start again from the top when the list changes (a new search or category).
  useEffect(() => setCount(page), [list, page]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= list.length) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setCount((c) => c + page), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count, list.length, page]);
  return [list.slice(0, count), count < list.length ? <div ref={sentinel} aria-hidden style={{ height: 1 }} /> : null];
}
