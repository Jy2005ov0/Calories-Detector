import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarCheck, Dumbbell, Flame, Search, UserRound } from "lucide-react";
import { Welcome } from "./components/Auth";
import { IntroGuide } from "./components/IntroGuide";
import { BodyCheckSheet } from "./components/BodyCheckSheet";
import { PhotoSheet } from "./components/PhotoSheet";
import { BarcodeSheet } from "./components/BarcodeSheet";
import { CoachSheet } from "./components/CoachSheet";
import { FoodSheet } from "./components/FoodSheet";
import { CustomFoodSheet } from "./components/MealBuilder";
import { ProgressSheet } from "./components/ProgressSheet";
import { t, useLanguage } from "./i18n";
import type { Food } from "./lib/types";
import { HelpButton, Tour } from "./components/Tour";
import { ToastHost } from "./components/ui";
import { resumeSync, useAccount } from "./lib/account";
import { applyTheme, onBackButton } from "./lib/platform";
import { actions, useStore } from "./lib/store";
import { FoodScreen } from "./screens/FoodScreen";
import { Plan } from "./screens/Plan";
import { Onboarding, ProfileScreen } from "./screens/Profile";
import { Today } from "./screens/Today";
import { Train } from "./screens/Train";

export type Tab = "today" | "food" | "train" | "plan" | "profile";
export type SheetKind = "photo" | "photoLibrary" | "bodyCheck" | "barcode" | "coach" | "progress" | null;

const TABS: { id: Tab; label: string; Icon: typeof Flame }[] = [
  { id: "today", label: "Today", Icon: Flame },
  { id: "food", label: "Food", Icon: Search },
  { id: "train", label: "Train", Icon: Dumbbell },
  { id: "plan", label: "Plan", Icon: CalendarCheck },
  { id: "profile", label: "Profile", Icon: UserRound },
];

export default function App() {
  const onboarded = useStore((s) => s.profile.onboarded);
  const account = useAccount();
  const chosen = !!account.token || account.guest;
  const introDone = useStore((s) => s.introDone);
  const theme = useStore((s) => s.theme);

  // Apply the appearance setting, and keep "System" in step if the phone switches mode.
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => resumeSync(), []);
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
  const reduce = useReducedMotion();

  // A different person (switched, or just added) starts on their own Today screen.
  const personId = useStore((s) => s.personId);
  useEffect(() => {
    setTab("today");
    setSheet(null);
  }, [personId]);

  useEffect(() => window.scrollTo(0, 0), [tab]);

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

  // New here: choose Apple / Google / email / no account. Existing users skip this.
  // First launch: the step-by-step guide comes first (with Skip), then sign-in.
  if (!onboarded && !chosen && !introDone) return <IntroGuide onDone={actions.finishIntro} />;
  // Toasts must show on these screens too (e.g. "Google sign-in isn't set up").
  if (!onboarded && !chosen)
    return (
      <>
        <Welcome />
        <ToastHost />
      </>
    );
  if (!onboarded)
    return (
      <>
        <Onboarding />
        <ToastHost />
      </>
    );

  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={`${tab}-${lang}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.15 }}
        >
          {tab === "today" && <Today go={setTab} openSheet={setSheet} />}
          {tab === "food" && <FoodScreen openSheet={setSheet} />}
          {tab === "train" && <Train />}
          {tab === "plan" && <Plan go={setTab} openSheet={setSheet} />}
          {tab === "profile" && <ProfileScreen openSheet={setSheet} />}
        </motion.main>
      </AnimatePresence>

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
      <PhotoSheet open={sheet === "photo" || sheet === "photoLibrary"} start={sheet === "photoLibrary" ? "library" : undefined} onClose={closeSheet} />
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
      <CoachSheet open={sheet === "coach"} onClose={closeSheet} />
      <ProgressSheet open={sheet === "progress"} onClose={closeSheet} />
      <Tour open={tour} onClose={closeTour} setTab={setTab} />
      <ToastHost />
    </div>
  );
}
