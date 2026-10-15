import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { pushBackHandler } from "../lib/platform";
import type { Tab } from "../App";
import { SPRING, Sheet } from "./ui";
import { ChevronRight, Compass } from "lucide-react";
import { GUIDES, type Guide, type Step } from "./guides";
import { t, useLanguage } from "../i18n";

export type { Guide, Step } from "./guides";

const PAD = 8;
const GAP = 12;
type Rect = { x: number; y: number; w: number; h: number };

/** Elements a target names (see guides.ts): by data-tour, CSS, or a header, tile or row's text. */
function candidates(target: string): HTMLElement[] {
  if (target.startsWith("css:")) return [...document.querySelectorAll<HTMLElement>(target.slice(4))];
  const m = target.match(/^(header|tile|row):(.*)$/);
  if (!m) return [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)];
  const text = t(m[2]);
  const sel = m[1] === "header" ? ".section-header" : m[1] === "tile" ? ".tile-title" : ".row-title";
  return [...document.querySelectorAll<HTMLElement>(sel)]
    .filter((el) => (el.textContent ?? "").trim().startsWith(text))
    .map((el) => (m[1] === "header" ? el : ((el.closest(m[1] === "tile" ? ".tile" : ".row") as HTMLElement | null) ?? el)));
}

function findTarget(step: Step) {
  // Screens not showing are kept (hidden or waiting off the edge), so take the copy actually on screen.
  for (const target of step.targets ?? []) for (const el of candidates(target)) if (el.getClientRects().length && !el.closest("[inert]")) return el;
  return null;
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resolves once an element has stopped moving (a smooth scroll has finished), or after a while. */
async function settled(el: HTMLElement, maxMs = 900) {
  const start = performance.now();
  let last = NaN;
  let still = 0;
  while (performance.now() - start < maxMs) {
    await frame();
    const top = el.getBoundingClientRect().top;
    still = Math.abs(top - last) < 0.5 ? still + 1 : 0;
    last = top;
    if (still >= 3) return;
  }
}

/**
 * The step-by-step guide. Between steps the highlight glides from one feature to the next while
 * the page scrolls smoothly underneath, and the card slides to its new place and crossfades its
 * text; it only waits when it has to switch tab.
 */
export function Tour({ open, steps = GUIDES[0].steps, onClose, setTab }: { open: boolean; steps?: Step[]; onClose: () => void; setTab: (t: Tab) => void }) {
  useLanguage();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  // The highlight follows its feature every frame; the card only moves once a step has settled.
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardRect, setCardRect] = useState<Rect | null>(null);
  const [shown, setShown] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(240);
  const cardHRef = useRef(240);
  cardHRef.current = cardH;
  const targetRef = useRef<HTMLElement | null>(null);
  const directionRef = useRef(1);
  const tabRef = useRef<Tab | null>(null);
  const movingRef = useRef(false);
  // A different guide can open before the step number is reset: never look past its last step.
  const at = Math.min(index, steps.length - 1);
  const step = steps[at];
  const last = at === steps.length - 1;

  useEffect(() => {
    if (open) {
      setIndex(0);
      directionRef.current = 1;
    } else {
      // Ready for the next guide, which may be shorter.
      setIndex(0);
      tabRef.current = null;
      setShown(false);
      setRect(null);
      setCardRect(null);
    }
  }, [open]);

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // Something taller than the room left for the card (a whole card with a clock in it): frame
    // its top part, so the card fits underneath instead of covering it.
    const room = window.innerHeight - cardHRef.current - GAP * 3 - Math.max(0, r.top);
    const h = Math.max(80, Math.min(r.height + PAD * 2, room));
    const next = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h };
    setRect(next);
    return next;
  }, []);

  // Each step: switch tab if needed, scroll the feature smoothly into view, then frame it.
  useLayoutEffect(() => {
    if (!open) return;
    let cancelled = false;
    movingRef.current = true;
    const tabChanged = tabRef.current !== step.tab;
    tabRef.current = step.tab;
    setTab(step.tab);
    (async () => {
      // A new tab needs a moment to draw; on the same tab the feature is already there.
      if (tabChanged) await wait(reduce ? 60 : 220);
      await frame();
      if (cancelled) return;
      const el = findTarget(step);
      if (!el && step.optional) {
        setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + directionRef.current)));
        return;
      }
      targetRef.current = el;
      const behavior = (reduce || tabChanged ? "instant" : "smooth") as ScrollBehavior;
      // Bring the feature near the top (scroll-margin keeps it clear of the ? button) so the card fits underneath.
      if (el) el.scrollIntoView({ block: "start", behavior });
      else window.scrollTo({ top: 0, behavior });
      if (el) await settled(el);
      else await frame();
      if (cancelled) return;
      movingRef.current = false;
      const r = el ? measure() : (setRect(null), null);
      setCardRect(r);
      setShown(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, index, step, setTab, measure, reduce]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => {
      const r = measure();
      if (!movingRef.current) setCardRect(r);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const releaseBack = pushBackHandler(onClose);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("keydown", onKey);
      releaseBack();
    };
  });

  useEffect(() => {
    if (shown) nextRef.current?.focus({ preventScroll: true });
  }, [shown, index]);

  const go = (dir: 1 | -1) => {
    if (dir === 1 && last) return onClose();
    directionRef.current = dir;
    setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + dir)));
  };

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight));
    ro.observe(el);
    setCardH(el.offsetHeight);
    return () => ro.disconnect();
  }, [shown]);

  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const vw = typeof window === "undefined" ? 400 : window.innerWidth;
  const below = cardRect ? cardRect.y + cardRect.h + GAP : 0;
  const fitsBelow = cardRect ? vh - below >= cardH + GAP : false;
  const fitsAbove = cardRect ? cardRect.y - GAP >= cardH + GAP : false;
  const top = !cardRect ? Math.max(GAP, (vh - cardH) / 2) : fitsBelow || !fitsAbove ? Math.max(GAP, Math.min(below, vh - cardH - GAP)) : cardRect.y - GAP - cardH;
  const move = reduce ? { duration: 0 } : SPRING;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {/* Blocks taps on the app underneath while the guide is open. */}
          <div className="tour-blocker" onClick={(e) => e.stopPropagation()} />
          <motion.div
            className="tour-spotlight"
            aria-hidden
            initial={{ x: vw / 2, y: vh / 2, width: 0, height: 0, borderRadius: 999 }}
            animate={rect ? { x: rect.x, y: rect.y, width: rect.w, height: rect.h, borderRadius: 18 } : { x: vw / 2, y: vh / 2, width: 0, height: 0, borderRadius: 999 }}
            transition={move}
          />
          {shown && (
            <motion.div
              ref={cardRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tour-title"
              aria-describedby="tour-body"
              className="tour-card"
              initial={reduce ? { opacity: 0, top } : { opacity: 0, scale: 0.96, top }}
              animate={{ opacity: 1, scale: 1, top }}
              transition={move}
            >
              <div className="tour-progress" aria-hidden>
                {steps.map((_, i) => (
                  <span key={i} className={i <= index ? "on" : undefined} />
                ))}
              </div>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={index}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 14 * directionRef.current }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -14 * directionRef.current }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                    {t("Step {n} of {total}", { n: index + 1, total: steps.length })}
                  </div>
                  <h2 id="tour-title" style={{ margin: "2px 0 6px", fontSize: 20, letterSpacing: "-0.02em" }}>
                    {t(step.title)}
                  </h2>
                  <p id="tour-body" style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--label-2)" }}>
                    {t(step.body)}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                {!last && (
                  <button className="link tap" onClick={onClose} style={{ marginRight: "auto", fontSize: 15 }}>
                    {t("Skip")}
                  </button>
                )}
                {index > 0 && (
                  <button className="btn small secondary" onClick={() => go(-1)}>
                    {t("Back")}
                  </button>
                )}
                <button ref={nextRef} className="btn small" onClick={() => go(1)} style={last ? { marginLeft: "auto" } : undefined}>
                  {index === 0 ? t("Show me") : last ? t("Done") : t("Next")}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  useLanguage();
  return (
    <button className="help-btn" data-tour="help" onClick={onClick} aria-label={t("How to use the app")}>
      ?
    </button>
  );
}

/** What the ? button opens: the quick tour, or a full guide to one part of the app. */
export function HelpSheet({ open, onClose, onPick, showCycle }: { open: boolean; onClose: () => void; onPick: (g: Guide) => void; showCycle: boolean }) {
  useLanguage();
  return (
    <Sheet open={open} onClose={onClose} title={t("Guides")}>
      <p className="footnote" style={{ margin: "0 0 12px" }}>
        {t("Pick a guide: it goes to each feature and shows you how it works.")}
      </p>
      <div className="group" data-testid="guides">
        {GUIDES.filter((g) => g.id !== "cycle" || showCycle).map((g) => (
          <button key={g.id} className="row with-icon" onClick={() => onPick(g)}>
            <div className="icon-tile" style={{ background: g.id === "quick" ? "var(--blue)" : "var(--indigo)" }}>
              <Compass size={17} />
            </div>
            <div className="row-main">
              <div className="row-title">{t(g.title)}</div>
              <div className="row-sub" style={{ whiteSpace: "normal" }}>
                {t(g.sub)} · {t("{n} steps", { n: g.steps.length })}
              </div>
            </div>
            <ChevronRight size={16} className="chev" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
