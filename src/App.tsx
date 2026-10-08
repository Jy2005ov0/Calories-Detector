import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarCheck, Dumbbell, Flame, Search, UserRound } from "lucide-react";
import { Welcome } from "./components/Auth";
import { BodyCheckSheet } from "./components/BodyCheckSheet";
import { PhotoSheet } from "./components/PhotoSheet";
import { HelpButton, Tour } from "./components/Tour";
import { ToastHost } from "./components/ui";
import { resumeSync, useAccount } from "./lib/account";
import { onBackButton } from "./lib/platform";
import { actions, useStore } from "./lib/store";
import { FoodScreen } from "./screens/FoodScreen";
import { Plan } from "./screens/Plan";
import { Onboarding, ProfileScreen } from "./screens/Profile";
import { Today } from "./screens/Today";
import { Train } from "./screens/Train";

export type Tab = "today" | "food" | "train" | "plan" | "profile";

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

  useEffect(() => resumeSync(), []);
  const live = useStore((s) => !!s.activeSessionId);
  const [tab, setTab] = useState<Tab>("today");
  const [photo, setPhoto] = useState(false);
  const [bodyCheck, setBodyCheck] = useState(false);
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

  const openPhoto = () => setPhoto(true);

  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.15 }}
        >
          {tab === "today" && <Today go={setTab} openPhoto={openPhoto} openBodyCheck={() => setBodyCheck(true)} />}
          {tab === "food" && <FoodScreen openPhoto={openPhoto} />}
          {tab === "train" && <Train />}
          {tab === "plan" && <Plan go={setTab} />}
          {tab === "profile" && <ProfileScreen openBodyCheck={() => setBodyCheck(true)} />}
        </motion.main>
      </AnimatePresence>

      <nav className="tabbar" aria-label="Main">
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
              {label}
              {id === "train" && live && <span className="live-dot" aria-label="Workout in progress" />}
            </button>
          ))}
        </div>
      </nav>

      <HelpButton onClick={() => setTour(true)} />
      <PhotoSheet open={photo} onClose={() => setPhoto(false)} />
      <BodyCheckSheet open={bodyCheck} onClose={() => setBodyCheck(false)} />
      <Tour open={tour} onClose={closeTour} setTab={setTab} />
      <ToastHost />
    </div>
  );
}
