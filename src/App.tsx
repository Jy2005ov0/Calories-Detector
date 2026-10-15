import { Activity, startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { HelpButton, HelpSheet, Tour, type Guide } from "./components/Tour";
import { GUIDES } from "./components/guides";
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
  // The guide showing (the quick tour after onboarding, or one picked from the ? menu).
  const [guide, setGuide] = useState<Guide | null>(null);
  const tour = guide !== null;
  const setTour = (on: boolean) => setGuide(on ? GUIDES[0] : null);
  const [help, setHelp] = useState(false);
  const canCycle = useStore((s) => s.profile.sex === "female");

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
  const mainRef = useRef<HTMLElement>(null);
  const pageRefs = useRef<Partial<Record<Tab, HTMLDivElement | null>>>({});
  const swipe = useTabSwipe(
    mainRef,
    pageRefs,
    TABS.map((x) => x.id),
    tab,
    setTab,
    !tour,
  );
  // The screens either side of this one are laid out (out of sight) so a swipe can show them at once:
  // the one just left straight away, the other a moment after a screen settles, when nothing's moving.
  const [seen, setSeen] = useState<{ tab: Tab; prev: Tab | null }>({ tab, prev: null });
  if (seen.tab !== tab) setSeen({ tab, prev: seen.tab });
  const [warm, setWarm] = useState<Tab | null>(null);
  useEffect(() => {
    const id = setTimeout(() => startTransition(() => setWarm(tab)), 400);
    return () => clearTimeout(id);
  }, [tab]);
  const at = TABS.findIndex((x) => x.id === tab);
  // Made once, so changing tab (or anything else here) doesn't redraw every screen.
  const screens = useMemo(
    () => ({
      today: <Today go={setTab} openSheet={setSheet} />,
      food: <FoodScreen openSheet={setSheet} />,
      train: <Train />,
      plan: <Plan go={setTab} />,
      profile: <ProfileScreen openSheet={setSheet} />,
    }),
    [],
  );

  // A different person (switched, or just added) starts on their own Today screen.
  const personId = useStore((s) => s.personId);
  useEffect(() => {
    setTab("today");
    setSheet(null);
  }, [personId]);

  // A new screen starts at the top, already in place after a page turn.
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
      {/* Every screen is kept ready: the others are built quietly in the background once and stay
          alive (hidden), so switching, by tap or by swipe, shows the next screen at once. The two
          either side wait just off the edges (see useTabSwipe). */}
      <main ref={mainRef} {...swipe.handlers}>
        <div key={lang} className="screens">
          {TABS.map(({ id }, i) => {
            const side = Math.abs(i - at) === 1;
            const shown = id === tab || (side && (warm === tab || seen.prev === id));
            return (
              <div
                key={id}
                ref={(el) => {
                  pageRefs.current[id] = el;
                }}
                className={id === tab ? "page current" : side ? "page side" : "page"}
                data-ready={shown ? "" : undefined}
                inert={id !== tab}
                aria-hidden={id !== tab || undefined}
              >
                <Activity mode={shown ? "visible" : "hidden"}>{screens[id]}</Activity>
              </div>
            );
          })}
        </div>
      </main>

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

      <HelpButton onClick={() => setHelp(true)} />
      <HelpSheet
        open={help}
        onClose={() => setHelp(false)}
        showCycle={canCycle}
        onPick={(g) => {
          setHelp(false);
          // Let the sheet slide away before the guide takes over.
          setTimeout(() => setGuide(g), 250);
        }}
      />
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
      <Tour open={tour} steps={guide ? guide.steps.filter((st) => !st.women || canCycle) : undefined} onClose={closeTour} setTab={setTab} />
      <ToastHost />
    </div>
  );
}
