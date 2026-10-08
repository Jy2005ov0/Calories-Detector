import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { pushBackHandler } from "../lib/platform";
import type { Tab } from "../App";
import { SPRING } from "./ui";

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
    title: "Welcome to Calories 👋",
    body: "This short guide shows you how to count calories, track workouts and follow your plan. It takes about a minute.",
  },
  {
    tab: "today",
    targets: ["summary"],
    title: "Your day at a glance",
    body: "The ring shows how many calories you have left. Eating fills it; workouts give calories back. Your protein, carbs and fat bars sit just below.",
  },
  {
    tab: "today",
    targets: ["scan"],
    title: "Snap your meal",
    body: "Take a photo of your plate. The app recognises each food, estimates the grams and works out the calories. You can adjust the portions before saving.",
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
    body: "Played futsal or went for a run? Log it here with its duration and the calories are added to your day. There are 230+ exercises and sports.",
  },
  {
    tab: "plan",
    targets: ["split"],
    title: "Your training plan",
    body: "Choose a split (Chest, Back, Legs, Shoulders, Arms, or others) and your days per week. Open a day to see sets, reps and form tips, then start it.",
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

function findTarget(step: Step) {
  for (const t of step.targets ?? []) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${t}"]`);
    if (el && el.getClientRects().length) return el;
  }
  return null;
}

export function Tour({ open, onClose, setTab }: { open: boolean; onClose: () => void; setTab: (t: Tab) => void }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(240);
  const targetRef = useRef<HTMLElement | null>(null);
  const directionRef = useRef(1);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (open) {
      setIndex(0);
      directionRef.current = 1;
    }
  }, [open]);

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
  }, []);

  // Move to the step's tab, wait for the screen to render, then find and frame the target.
  useLayoutEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);
    setTab(step.tab);
    const timer = setTimeout(() => {
      if (cancelled) return;
      const el = findTarget(step);
      if (!el && step.optional) {
        setIndex((i) => Math.min(TOUR_STEPS.length - 1, Math.max(0, i + directionRef.current)));
        return;
      }
      targetRef.current = el;
      if (el) {
        // Bring the feature near the top (scroll-margin keeps it clear of the ? button) so the
        // guide card fits underneath, even on small phones.
        el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
      } else {
        window.scrollTo(0, 0);
      }
      requestAnimationFrame(() => {
        if (cancelled) return;
        measure();
        setReady(true);
      });
    }, 360);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, index, step, setTab, measure]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const releaseBack = pushBackHandler(onClose);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("keydown", onKey);
      releaseBack();
    };
  });

  useEffect(() => {
    if (ready) nextRef.current?.focus({ preventScroll: true });
  }, [ready, index]);

  const go = (dir: 1 | -1) => {
    if (dir === 1 && last) return onClose();
    directionRef.current = dir;
    setIndex((i) => Math.min(TOUR_STEPS.length - 1, Math.max(0, i + dir)));
  };

  useLayoutEffect(() => {
    if (ready && cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [ready, index]);

  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const GAP = 12;
  const below = rect ? rect.y + rect.h + GAP : 0;
  const fitsBelow = rect ? vh - below >= cardH + GAP : false;
  const fitsAbove = rect ? rect.y - GAP >= cardH + GAP : false;
  const cardStyle: React.CSSProperties = !rect
    ? { top: "50%", transform: "translateY(-50%)" }
    : fitsBelow || !fitsAbove
      ? { top: Math.min(below, vh - cardH - GAP) }
      : { top: rect.y - GAP - cardH };
  const placeBelow = !rect || fitsBelow || !fitsAbove;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="tour"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Blocks taps on the app underneath while the guide is open. */}
          <div className="tour-blocker" onClick={(e) => e.stopPropagation()} />
          <motion.div
            className="tour-spotlight"
            aria-hidden
            initial={false}
            animate={
              rect && ready
                ? { x: rect.x, y: rect.y, width: rect.w, height: rect.h, opacity: 1, borderRadius: 18 }
                : { x: window.innerWidth / 2, y: vh / 2, width: 0, height: 0, opacity: 1, borderRadius: 999 }
            }
            transition={reduce ? { duration: 0 } : SPRING}
          />
          <AnimatePresence mode="wait">
            {ready && (
              <motion.div
                key={index}
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-title"
                aria-describedby="tour-body"
                className="tour-card"
                style={cardStyle}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: placeBelow ? -6 : 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              >
                <div className="tour-progress" aria-hidden>
                  {TOUR_STEPS.map((_, i) => (
                    <span key={i} className={i <= index ? "on" : undefined} />
                  ))}
                </div>
                <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                  Step {index + 1} of {TOUR_STEPS.length}
                </div>
                <h2 id="tour-title" style={{ margin: "2px 0 6px", fontSize: 20, letterSpacing: "-0.02em" }}>
                  {step.title}
                </h2>
                <p id="tour-body" style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--label-2)" }}>
                  {step.body}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                  {!last && (
                    <button className="link" onClick={onClose} style={{ marginRight: "auto", fontSize: 15 }}>
                      Skip
                    </button>
                  )}
                  {index > 0 && (
                    <button className="btn small secondary" onClick={() => go(-1)}>
                      Back
                    </button>
                  )}
                  <button ref={nextRef} className="btn small" onClick={() => go(1)} style={last ? { marginLeft: "auto" } : undefined}>
                    {index === 0 ? "Show me" : last ? "Done" : "Next"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="help-btn" data-tour="help" onClick={onClick} aria-label="How to use the app">
      ?
    </button>
  );
}
