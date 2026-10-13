import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { pushBackHandler } from "../lib/platform";
import type { Tab } from "../App";
import { SPRING } from "./ui";
import { t, useLanguage } from "../i18n";

interface Step {
  tab: Tab;
  /** data-tour targets, first match wins. Missing target → card shows centred. */
  targets?: string[];
  /** Skip the step when none of its targets are on screen (e.g. mid-workout). */
  optional?: boolean;
  title: string;
  body: string;
}

export const TOUR_STEPS: Step[] = [
  {
    tab: "today",
    title: "Welcome to W 👋",
    body: "This short guide shows you how to count calories, track workouts and follow your plan. It takes about a minute.",
  },
  {
    tab: "today",
    targets: ["summary"],
    title: "Your day at a glance",
    body: "The orange ring shows the calories you have left: eating fills it, workouts give calories back. The teal ring counts your steps, and protein, carbs and fat sit below.",
  },
  {
    tab: "today",
    targets: ["water-cup"],
    title: "Drink water",
    body: "Tap the cup each time you drink. The water drains as the cup is counted, then the cup fills back up. Hold it to take a cup back.",
  },
  {
    tab: "today",
    targets: ["barcode"],
    title: "Scan a barcode",
    body: "Point the camera at the barcode on packaged food to get its calories and nutrition. You can also type the number.",
  },
  {
    tab: "today",
    targets: ["body-check"],
    title: "Body check & BMI",
    body: "Enter your height and weight to see your BMI and get a recommendation on how to train and what to eat. One tap applies it to your plan.",
  },
  {
    tab: "food",
    targets: ["food-search"],
    title: "Search any food",
    body: "Type a food like 'nasi lemak' or 'Milo'. Pick the portion and you'll see the calories, a health grade and whether it suits your goal.",
  },
  {
    tab: "food",
    targets: ["food-tools"],
    title: "Build your own meals",
    body: "Build a meal from any foods and amounts and save it to log in one tap later. Add your own foods from a nutrition label with 'New food'.",
  },
  {
    tab: "train",
    targets: ["clock-in", "clock-out"],
    title: "Clock in at the gym",
    body: "Tap Clock in when you start. A live timer counts your time and calories. Log sets and weights, then clock out to save the workout.",
  },
  {
    tab: "train",
    targets: ["log-activity"],
    optional: true,
    title: "Log other activities",
    body: "Played futsal or went for a run? Log it here with its duration and the calories are added to your day. There are 6,000+ exercises and sports, and you can create your own.",
  },
  {
    tab: "plan",
    targets: ["split"],
    title: "Your training plan",
    body: "Choose a split and your days per week. Press and hold a day or an exercise to drag it into your own order, and tap an exercise to see how it's done.",
  },
  {
    tab: "plan",
    targets: ["plan-tabs"],
    title: "What to eat",
    body: "The Nutrition tab shows your calorie and protein targets, foods to eat and limit, and a sample day of meals you can log.",
  },
  {
    tab: "profile",
    targets: ["field-weight"],
    title: "Keep your profile up to date",
    body: "Update your weight here as it changes, along with your goal and activity below. Every target and plan in the app adjusts automatically.",
  },
  {
    tab: "today",
    targets: ["help"],
    title: "Need help again?",
    body: "Tap the ? button any time to replay this guide.",
  },
];

const PAD = 8;
const GAP = 12;
type Rect = { x: number; y: number; w: number; h: number };

function findTarget(step: Step) {
  for (const t of step.targets ?? []) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${t}"]`);
    if (el && el.getClientRects().length) return el;
  }
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
export function Tour({ open, onClose, setTab }: { open: boolean; onClose: () => void; setTab: (t: Tab) => void }) {
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
  const targetRef = useRef<HTMLElement | null>(null);
  const directionRef = useRef(1);
  const tabRef = useRef<Tab | null>(null);
  const movingRef = useRef(false);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (open) {
      setIndex(0);
      directionRef.current = 1;
    } else {
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
    const next = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
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
        setIndex((i) => Math.min(TOUR_STEPS.length - 1, Math.max(0, i + directionRef.current)));
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
    setIndex((i) => Math.min(TOUR_STEPS.length - 1, Math.max(0, i + dir)));
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
                {TOUR_STEPS.map((_, i) => (
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
                    {t("Step {n} of {total}", { n: index + 1, total: TOUR_STEPS.length })}
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
