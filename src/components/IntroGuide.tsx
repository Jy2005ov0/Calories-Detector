import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Camera, CircleHelp, Dumbbell, HeartPulse, Target, Users, type LucideIcon } from "lucide-react";
import { SPRING, SPRING_MOMENTUM, project } from "./ui";
import { t, useLanguage } from "../i18n";

interface Slide {
  Icon: LucideIcon;
  colors: [string, string];
  title: string;
  body: string;
  points: string[];
}

export const INTRO_SLIDES: Slide[] = [
  {
    Icon: Camera,
    colors: ["#0a84ff", "#5e5ce6"],
    title: "Snap or search your food",
    body: "Take a photo of your plate and the app works out what's on it and how many calories it has.",
    points: ["11,000+ foods from around the world", "Millions of packaged products online", "Build and save your own meals"],
  },
  {
    Icon: HeartPulse,
    colors: ["#30d158", "#40c8e0"],
    title: "Know if it's good for you",
    body: "Every food and meal gets a health grade from A to E and a verdict on whether it suits your goal today.",
    points: ["Protein, carbs and fat for every portion", "Warnings for sugar, salt and saturated fat", "Daily limits on the Today screen"],
  },
  {
    Icon: Dumbbell,
    colors: ["#ff9f0a", "#ff375f"],
    title: "Clock in at the gym",
    body: "Start a workout with one tap. A live timer counts your time and calories while you log sets and weights.",
    points: ["1,900+ exercises and sports", "Calories from real activity data", "Workouts add calories back to your day"],
  },
  {
    Icon: Target,
    colors: ["#bf5af2", "#5e5ce6"],
    title: "A plan made for your body",
    body: "Enter your height and weight to get your BMI, a training split and what to eat — chest, back, legs, arms and more.",
    points: ["Training plans for 2–6 days a week", "Calorie and protein targets", "A sample day of meals you can log"],
  },
  {
    Icon: Users,
    colors: ["#64d2ff", "#0a84ff"],
    title: "For you and your family",
    body: "No sign-up. Your data stays on your phone, and family members get their own profiles.",
    points: ["Works offline", "Back up to move phones", "Tap ? to see this guide again"],
  },
];

/** Full-screen intro shown on first launch, before setting up a profile. Swipe, tap Next, or Skip. */
export function IntroGuide({ onDone }: { onDone: () => void }) {
  useLanguage();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const last = index === INTRO_SLIDES.length - 1;

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Follow the current page; keep position correct when the screen rotates or resizes.
  useEffect(() => {
    if (!width) return;
    if (reduce) x.set(-index * width);
    else animate(x, -index * width, SPRING);
  }, [index, width, reduce, x]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(INTRO_SLIDES.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const go = (i: number) => setIndex(Math.max(0, Math.min(INTRO_SLIDES.length - 1, i)));

  return (
    <div className="intro" role="region" aria-roledescription="carousel" aria-label={t("Welcome guide")}>
      <div className="intro-top">
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }} aria-live="polite">
          {t("{n} of {total}", { n: index + 1, total: INTRO_SLIDES.length })}
        </span>
        <button className="link bold tap" onClick={onDone}>
          {t("Skip")}
        </button>
      </div>

      <div ref={viewport} className="intro-viewport">
        <motion.div
          className="intro-track"
          style={{ x, width: width * INTRO_SLIDES.length || undefined }}
          drag={reduce ? false : "x"}
          dragConstraints={{ left: -(INTRO_SLIDES.length - 1) * width, right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            // Choose the page from where the flick is heading, one page at a time.
            const projected = x.get() + project(info.velocity.x, 0.99);
            const target = Math.round(-projected / width);
            const clamped = Math.max(index - 1, Math.min(index + 1, target));
            if (clamped === index) animate(x, -index * width, SPRING_MOMENTUM);
            else go(clamped);
          }}
        >
          {INTRO_SLIDES.map((s, i) => (
            <section
              key={s.title}
              className="intro-slide"
              style={{ width: width || "100%" }}
              aria-roledescription="slide"
              aria-label={t("{n} of {total}", { n: i + 1, total: INTRO_SLIDES.length })}
              aria-hidden={i !== index}
            >
              <div className="intro-art" style={{ background: `linear-gradient(135deg, ${s.colors[0]}, ${s.colors[1]})` }}>
                <s.Icon size={64} strokeWidth={1.6} color="#fff" />
              </div>
              <h1 className="large-title" style={{ textAlign: "center", marginTop: 28 }}>
                {t(s.title)}
              </h1>
              <p className="subtitle" style={{ textAlign: "center", maxWidth: 340, margin: "8px auto 0" }}>
                {t(s.body)}
              </p>
              <ul className="intro-points">
                {s.points.map((p) => (
                  <li key={p}>{t(p)}</li>
                ))}
              </ul>
            </section>
          ))}
        </motion.div>
      </div>

      <div className="intro-dots" role="tablist" aria-label={t("Pages")}>
        {INTRO_SLIDES.map((s, i) => (
          <button
            key={s.title}
            role="tab"
            aria-selected={i === index}
            aria-label={t("Page {n}: {title}", { n: i + 1, title: t(s.title) })}
            className={i === index ? "on" : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div className="btn-row">
        {index > 0 && (
          <button className="btn secondary" style={{ width: 110, flex: "none" }} onClick={() => go(index - 1)}>
            {t("Back")}
          </button>
        )}
        <button ref={nextRef} className="btn" onClick={() => (last ? onDone() : go(index + 1))}>
          {last ? t("Get started") : t("Next")}
        </button>
      </div>
      <p className="footnote" style={{ textAlign: "center", marginTop: 12 }}>
        <CircleHelp size={13} style={{ verticalAlign: "-2px" }} /> {t("You can replay the guide from the ? button any time.")}
      </p>
    </div>
  );
}
