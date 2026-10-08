import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarCheck, Dumbbell, Flame, Search, UserRound } from "lucide-react";
import { PhotoSheet } from "./components/PhotoSheet";
import { ToastHost } from "./components/ui";
import { useStore } from "./lib/store";
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
  const live = useStore((s) => !!s.activeSessionId);
  const [tab, setTab] = useState<Tab>("today");
  const [photo, setPhoto] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => window.scrollTo(0, 0), [tab]);

  if (!onboarded) return <Onboarding />;

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
          {tab === "today" && <Today go={setTab} openPhoto={openPhoto} />}
          {tab === "food" && <FoodScreen openPhoto={openPhoto} />}
          {tab === "train" && <Train />}
          {tab === "plan" && <Plan go={setTab} />}
          {tab === "profile" && <ProfileScreen />}
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

      <PhotoSheet open={photo} onClose={() => setPhoto(false)} />
      <ToastHost />
    </div>
  );
}
