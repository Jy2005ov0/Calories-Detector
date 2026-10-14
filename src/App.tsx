import { Activity, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, Dumbbell, Flame, Search, UserRound } from "lucide-react";
import { IntroGuide } from "./components/IntroGuide";
import { BodyCheckSheet } from "./components/BodyCheckSheet";
import { useTabSwipe } from "./lib/useTabSwipe";
import { BarcodeSheet } from "./components/BarcodeSheet";
import { FoodSheet } from "./components/FoodSheet";
import { CustomFoodSheet } from "./components/MealBuilder";
import { ProgressSheet } from "./components/ProgressSheet";
import { t, useLanguage } from "./i18n";
import type { Food } from "./lib/types";
import { HelpButton, Tour } from "./components/Tour";
import { ToastHost } from "./components/ui";
import { applyTheme, onBackButton } from "./lib/platform";
import { actions, useStore } from "./lib/store";
import { FoodScreen } from "./screens/FoodScreen";
import { Plan } from "./screens/Plan";
import { Onboarding, ProfileScreen } from "./screens/Profile";
import { Today } from "./screens/Today";
import { Train } from "./screens/Train";

export type Tab = "today" | "food" | "train" | "plan" | "profile";
export type SheetKind = "bodyCheck" | "barcode" | "progress" | null;

const TABS: { id: Tab; label: string; Icon: typeof Flame }[] = [
  { id: "today", label: "Today", Icon: Flame },
  { id: "food", label: "Food", Icon: Search },
  { id: "train", label: "Train", Icon: Dumbbell },
  { id: "plan", label: "Plan", Icon: CalendarCheck },
  { id: "profile", label: "Profile", Icon: UserRound },
];

export default function App() {
  const onboarded = useStore((s) => s.profile.onboarded);
  const introDone = useStore((s) => s.introDone);
  const theme = useStore((s) => s.theme);
  const textSize = useStore((s) => s.textSize);
  // Larger text scales the whole interface, so layouts reflow instead of clipping.
  useEffect(() => {
    if (textSize === "normal") delete document.documentElement.dataset.text;
    else document.documentElement.dataset.text = textSize;
  }, [textSize]);

  // Apply the appearance setting, and keep "System" in step if the phone switches mode.
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const live = useStore((s) => !!s.activeSessionId);
  const [tab, setTab] = useState<Tab>("today");
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [found, setFound] = useState<Food | null>(null);
  const [newFood, setNewFood] = useState(false);
  const lang = useLanguage();
  const closeSheet = () => setSheet(null);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang === "ms" ? "ms-MY" : "en";
  }, [lang]);
  const tourDone = useStore((s) => s.tourDone);
  const [tour, setTour] = useState(false);

  // Offer the guide once, right after onboarding.
  useEffect(() => {
    if (onboarded && !tourDone) setTour(true);
  }, [onboarded, tourDone]);

  const closeTour = () => {
    setTour(false);
    actions.finishTour();
    setTab("today");
  };
  // Swipe left or right to move between tabs (not while the guide is showing).
  const swipe = useTabSwipe(
    TABS.map((x) => x.id),
    tab,
    setTab,
    !tour,
  );

  // A different person (switched, or just added) starts on their own Today screen.
  const personId = useStore((s) => s.personId);
  useEffect(() => {
    setTab("today");
    setSheet(null);
  }, [personId]);

  // A new screen starts at the top and slides (after a swipe) or fades (after a tap) in.
  const firstTab = useRef(true);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (firstTab.current) firstTab.current = false;
    else swipe.enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Android back: close the top sheet, else return to Today, else leave the app.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  useEffect(
    () =>
      onBackButton(() => {
        if (tabRef.current === "today") return false;
        setTab("today");
        return true;
      }),
    [],
  );

  // First launch: the step-by-step guide (with Skip), then setting up a profile. No sign-up needed.
  if (!onboarded && !introDone) return <IntroGuide onDone={actions.finishIntro} />;
  if (!onboarded)
    return (
      <>
        <Onboarding />
        <ToastHost />
      </>
    );

  return (
    <div className="app">
      {/* The new tab shows at once (no waiting for the old one to fade out) with a quick fade-in. */}
      {/* Every screen is kept ready: the others are built quietly in the background once and stay
          alive (hidden), so switching, by tap or by swipe, shows the next screen at once. */}
      <motion.main key={lang} style={{ x: swipe.x, opacity: swipe.opacity }} {...swipe.handlers}>
        {TABS.map(({ id }) => (
          <Activity key={id} mode={tab === id ? "visible" : "hidden"}>
            {id === "today" && <Today go={setTab} openSheet={setSheet} />}
            {id === "food" && <FoodScreen openSheet={setSheet} />}
            {id === "train" && <Train />}
            {id === "plan" && <Plan go={setTab} />}
            {id === "profile" && <ProfileScreen openSheet={setSheet} />}
          </Activity>
        ))}
      </motion.main>

      <nav className="tabbar" aria-label={t("Main")}>
        <div className="tabbar-inner">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`tab ${tab === id ? "active" : ""}`}
              // Switch on press, not release, so the tab responds instantly.
              onPointerDown={(e) => e.button === 0 && setTab(id)}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={24} strokeWidth={tab === id ? 2.3 : 1.8} />
              {t(label)}
              {id === "train" && live && <span className="live-dot" aria-label={t("Workout in progress")} />}
            </button>
          ))}
        </div>
      </nav>

      <HelpButton onClick={() => setTour(true)} />
      <BodyCheckSheet open={sheet === "bodyCheck"} onClose={closeSheet} />
      <BarcodeSheet
        open={sheet === "barcode"}
        onClose={closeSheet}
        onFound={(f) => {
          setSheet(null);
          setFound(f);
        }}
        onNewFood={() => {
          setSheet(null);
          setNewFood(true);
        }}
      />
      <FoodSheet food={found} onClose={() => setFound(null)} />
      <CustomFoodSheet open={newFood} onClose={() => setNewFood(false)} />
      <ProgressSheet open={sheet === "progress"} onClose={closeSheet} />
      <Tour open={tour} onClose={closeTour} setTab={setTab} />
      <ToastHost />
    </div>
  );
}
