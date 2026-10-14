import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowDown, RefreshCw } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { t, useLanguage } from "../i18n";
import { useStore } from "../lib/store";
import { PersonAvatar, nameOf, switchTo } from "./People";
import { haptic } from "./ui";

/** How far the page has to come down (after resistance) before letting go switches person. */
const ARM = 92;
const MAX = 170;
const DECIDE_PX = 8;
// Pulling feels heavier the further it goes.
const rubber = (d: number) => (d <= 0 ? 0 : Math.min(MAX, d * 0.55));

/**
 * Today, for a family on one phone: at the top of the page, pull down to switch to the next person.
 * A panel above the page shows who's next; past the line it says "Release" (with a tap of the phone)
 * and letting go switches, with the page fading over to the new person's day. Each pull goes on to
 * the next person in turn. Fingers use touch events, so the page doesn't also try to scroll.
 */
export function PullToSwitch({ children }: { children: ReactNode }) {
  useLanguage();
  const reduce = useReducedMotion();
  const next = useStore((s) => s.people.find((p) => p.data.profile.onboarded));
  const ref = useRef<HTMLDivElement>(null);
  const pull = useMotionValue(0);
  const fade = useMotionValue(1);
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const g = useRef<{ x: number; y: number; id: number; pulling: boolean } | null>(null);
  const busy = useRef(false);
  const live = useRef({ next });
  live.current = { next };

  const panelOpacity = useTransform(pull, [0, 36, ARM], [0, 0.6, 1]);

  const setArm = (on: boolean) => {
    if (armedRef.current === on) return;
    armedRef.current = on;
    setArmed(on);
    if (on) haptic("light");
  };

  const begin = (x: number, y: number, id: number) => {
    // Only from the very top of the page, with someone to switch to, and not mid-switch.
    if (!live.current.next || busy.current || window.scrollY > 2) return (g.current = null);
    g.current = { x, y, id, pulling: false };
  };
  /** True while this gesture is a pull (the caller then stops the browser scrolling). */
  const move = (x: number, y: number) => {
    const s = g.current;
    if (!s) return false;
    const dx = x - s.x;
    const dy = y - s.y;
    if (!s.pulling) {
      if (Math.hypot(dx, dy) < DECIDE_PX) return false;
      if (dy <= 0 || dy < Math.abs(dx) * 1.2) return void (g.current = null), false;
      s.pulling = true;
    }
    const d = rubber(dy);
    pull.set(d);
    setArm(d >= ARM);
    return true;
  };
  const end = () => {
    const s = g.current;
    g.current = null;
    if (!s?.pulling) return;
    const person = live.current.next;
    if (!armedRef.current || !person) {
      setArm(false);
      animate(pull, 0, { type: "spring", bounce: 0, duration: 0.3 });
      return;
    }
    void doSwitch(person.id, person.data.profile.name);
  };

  const doSwitch = async (id: string, name: string) => {
    busy.current = true;
    if (reduce) {
      switchTo(id, name);
      pull.jump(0);
      setArm(false);
      busy.current = false;
      return;
    }
    // Hold the panel open while the page fades out, switch, then bring the new day in.
    animate(pull, ARM + 8, { type: "spring", bounce: 0, duration: 0.2 });
    await animate(fade, 0, { duration: 0.14, ease: "easeIn" });
    const ok = switchTo(id, name);
    haptic(ok ? "success" : "light");
    // Let the new person's day draw before it fades in.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    setArm(false);
    animate(pull, 0, { type: "spring", bounce: 0, duration: 0.38 });
    await animate(fade, 1, { duration: 0.22, ease: "easeOut" });
    busy.current = false;
  };

  // Fingers: native listeners, because React's touch listeners can't stop a scroll. Once a finger is
  // down, its moves and lift are followed on the whole window, so the lift is never missed.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const touchOf = (e: TouchEvent) => {
      const s = g.current;
      return s ? Array.from(e.changedTouches).find((x) => x.identifier === s.id) : undefined;
    };
    const moveT = (e: TouchEvent) => {
      const s = g.current;
      const tch = touchOf(e);
      if (!s || !tch) return;
      if (!e.cancelable && !s.pulling) {
        g.current = null;
        return stop();
      }
      if (move(tch.clientX, tch.clientY) && e.cancelable) e.preventDefault();
    };
    const endT = (e: TouchEvent) => {
      if (!touchOf(e) && e.touches.length) return;
      stop();
      end();
    };
    const cancel = () => {
      stop();
      if (g.current?.pulling) {
        g.current = null;
        setArm(false);
        animate(pull, 0, { type: "spring", bounce: 0, duration: 0.3 });
      } else g.current = null;
    };
    const stop = () => {
      window.removeEventListener("touchmove", moveT);
      window.removeEventListener("touchend", endT);
      window.removeEventListener("touchcancel", cancel);
    };
    const start = (e: TouchEvent) => {
      unstick();
      if (e.touches.length !== 1) return void (g.current = null);
      begin(e.touches[0].clientX, e.touches[0].clientY, e.touches[0].identifier);
      if (!g.current) return;
      stop();
      window.addEventListener("touchmove", moveT, { passive: false });
      window.addEventListener("touchend", endT);
      window.addEventListener("touchcancel", cancel);
    };
    el.addEventListener("touchstart", start, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Safety net: a page left pulled down (no pull or switch running) springs back on the next touch. */
  const unstick = () => {
    if (!g.current && !busy.current && !pull.isAnimating() && pull.get() > 0.5) {
      setArm(false);
      animate(pull, 0, { type: "spring", bounce: 0, duration: 0.3 });
    }
  };

  // A mouse (a computer, or the tests): the same with pointer events.
  const mouse = {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      unstick();
      begin(e.clientX, e.clientY, e.pointerId);
    },
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || g.current?.id !== e.pointerId) return;
      const was = g.current.pulling;
      // Once it's a pull, keep the pointer even if it leaves the window.
      if (move(e.clientX, e.clientY) && !was) (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    },
    onPointerUp: (e: PointerEvent) => e.pointerType === "mouse" && g.current?.id === e.pointerId && end(),
    onLostPointerCapture: (e: PointerEvent) => e.pointerType === "mouse" && g.current?.id === e.pointerId && end(),
  };

  const label = next ? nameOf(next.data.profile.name) : "";
  return (
    <div ref={ref} className="pull-switch-wrap" {...mouse}>
      {next && (
        <motion.div className="pull-switch" style={{ height: pull, opacity: panelOpacity }} aria-hidden data-testid="pull-switch">
          <div className="pull-switch-inner">
            <PersonAvatar id={next.id} name={next.data.profile.name} photo={next.data.profile.photo} size={40} />
            <div className="pull-switch-text">
              <span className={`pull-switch-hint${armed ? " armed" : ""}`}>
                <motion.span key={armed ? "on" : "off"} initial={{ rotate: armed ? -180 : 0, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.3, duration: 0.35 }} style={{ display: "inline-flex" }}>
                  {armed ? <RefreshCw size={13} /> : <ArrowDown size={13} />}
                </motion.span>
                {armed ? t("Release to switch to") : t("Pull to switch to")}
              </span>
              <span className="pull-switch-name">{label}</span>
            </div>
          </div>
        </motion.div>
      )}
      <motion.div style={{ y: pull, opacity: fade }}>{children}</motion.div>
    </div>
  );
}
