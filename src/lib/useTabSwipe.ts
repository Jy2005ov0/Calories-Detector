import { useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";

/**
 * Swipe left or right anywhere on a screen to go to the next or previous tab. The screen follows
 * the finger one to one; let go past the threshold (or with a flick) and it carries on off the
 * screen while the next one slides in. Swipe-to-delete rows, the sleep clock, sliders and text
 * fields keep their own sideways drag; a chip row scrolls until it reaches its end; and a quick
 * swipe on something you press and hold (plan cards, the water cup) still turns the page.
 *
 * Fingers are handled with touch events, not pointer events: the moment a touch starts moving the
 * app decides whether it's a sideways swipe (and then stops the browser scrolling) or a scroll
 * (and then lets go). With pointer events the browser grabbed any swipe that wasn't almost flat as
 * a scroll and cancelled it, so swipes failed "sometimes", and almost always on long lists.
 */
const OWN_GESTURE = ".swipe-row, .sleep-clock, [role=slider], input, textarea, select, [data-no-swipe]";
/** Things you press and hold (plan cards, the water cup): a quick swipe on them still turns the page. */
const HOLDABLE = ".hold-move, .water-cup-btn";
const HOLD_MS = 300;

/** How far a finger moves before deciding, and how steep a swipe can be and still turn the page (≈ 45°). */
const DECIDE_PX = 8;
const SIDEWAYS_RATIO = 1;

type Gesture = { x: number; y: number; t: number; lastX: number; lastT: number; prevX: number; prevT: number; sideways: boolean; id: number; holdable: boolean; target: Element | null };

/**
 * A row that scrolls sideways (chips) and still has room to go the way the finger is moving: it
 * scrolls, and the page turns only once it has reached its end.
 */
function scrollsSideways(from: Element | null, dx: number) {
  for (let el = from; el && el.tagName !== "MAIN"; el = el.parentElement) {
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const ox = getComputedStyle(el).overflowX;
    if (ox !== "auto" && ox !== "scroll") continue;
    // Finger moving left scrolls the row towards its end, and the other way round.
    if (dx < 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 1) return true;
  }
  return false;
}

export function useTabSwipe<T extends string>(main: RefObject<HTMLElement | null>, tabs: readonly T[], tab: T, setTab: (t: T) => void, enabled = true) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const g = useRef<Gesture | null>(null);
  // If a swipe stops hearing from the finger (the thing it started on was removed mid-swipe, so the
  // browser sends the rest of its events nowhere we can see), put the page back rather than leave it.
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swiped = useRef(false);
  // Which side the next screen comes in from, set by a swipe and used once it's showing.
  const incoming = useRef<0 | 1 | -1>(0);
  // Read inside the native listeners, which are added once.
  const live = useRef({ tabs, tab, setTab, enabled, reduce });
  live.current = { tabs, tab, setTab, enabled, reduce };

  const settle = () => {
    clearTimeout(watchdog.current);
    g.current = null;
    animate(x, 0, { type: "spring", bounce: 0, duration: 0.28 });
  };

  const begin = (cx: number, cy: number, target: EventTarget | null, id: number) => {
    if (!live.current.enabled || (target as Element | null)?.closest?.(OWN_GESTURE)) return (g.current = null);
    const t = performance.now();
    const holdable = !!(target as Element | null)?.closest?.(HOLDABLE);
    g.current = { x: cx, y: cy, t, lastX: cx, lastT: t, prevX: cx, prevT: t, sideways: false, id, holdable, target: target as Element | null };
  };

  /** Returns true once the gesture is a page turn (the caller then stops the browser scrolling). */
  const move = (cx: number, cy: number) => {
    const s = g.current;
    if (!s) return false;
    const dx = cx - s.x;
    const dy = cy - s.y;
    if (!s.sideways) {
      if (Math.hypot(dx, dy) < DECIDE_PX) return false;
      // Held still first: that's a press-and-hold (moving a card), not a swipe.
      const held = s.holdable && performance.now() - s.t > HOLD_MS;
      if (held || Math.abs(dx) <= Math.abs(dy) * SIDEWAYS_RATIO || scrollsSideways(s.target, dx)) {
        // Mostly up or down, or a chip row with room to scroll: let the browser have it.
        g.current = null;
        return false;
      }
      s.sideways = true;
      // A page turn never selects the text it passes over.
      document.getSelection()?.removeAllRanges();
    }
    s.prevX = s.lastX;
    s.prevT = s.lastT;
    s.lastX = cx;
    s.lastT = performance.now();
    clearTimeout(watchdog.current);
    watchdog.current = setTimeout(() => g.current === s && settle(), 800);
    const { tabs, tab } = live.current;
    const i = tabs.indexOf(tab);
    // Follow the finger; past the first and last tab, rubber-band.
    const edge = (dx > 0 && i === 0) || (dx < 0 && i === tabs.length - 1);
    x.set(edge ? dx * 0.25 : dx);
    return true;
  };

  const end = (cx: number) => {
    clearTimeout(watchdog.current);
    const s = g.current;
    g.current = null;
    if (!s?.sideways) return;
    swiped.current = true;
    setTimeout(() => (swiped.current = false), 80);
    const { tabs, tab, setTab, reduce } = live.current;
    const dx = cx - s.x;
    // Speed over the last bit of the swipe, so a quick flick counts even if it was short.
    const speed = (s.lastX - s.prevX) / Math.max(1, s.lastT - s.prevT);
    const dir: 1 | -1 = dx < 0 ? 1 : -1;
    const next = tabs.indexOf(tab) + dir;
    const far = Math.abs(dx) > Math.min(90, window.innerWidth * 0.22);
    const flick = Math.abs(speed) > 0.4 && Math.sign(speed) === Math.sign(dx) && Math.abs(dx) > 30;
    if (!(far || flick) || next < 0 || next >= tabs.length) return settle();
    // Carry on off the screen in the same direction, then show the next one.
    const go = () => {
      incoming.current = dir;
      setTab(tabs[next]);
    };
    if (reduce) return go();
    void animate(x, -dir * window.innerWidth, { duration: 0.14, ease: [0.4, 0, 1, 1] }).then(go);
  };

  // Fingers: native listeners, because React's touch listeners are passive and can't stop a scroll.
  // Once a finger is down, its moves and lift are followed on the whole window: if the thing it
  // started on changes or goes away mid-swipe, the lift still arrives and the page never gets stuck.
  useEffect(() => {
    const el = main.current;
    if (!el) return;
    const touchOf = (e: TouchEvent) => {
      const s = g.current;
      return s ? Array.from(e.changedTouches).find((x) => x.identifier === s.id) : undefined;
    };
    const moveT = (e: TouchEvent) => {
      const s = g.current;
      const t = touchOf(e);
      if (!s || !t) return;
      // Already scrolling (the browser started before we decided): leave it alone.
      if (!e.cancelable && !s.sideways) return stop();
      if (move(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
    };
    const endT = (e: TouchEvent) => {
      const s = g.current;
      if (!s) return stop();
      const t = touchOf(e);
      if (!t && e.touches.length) return;
      stop();
      end(t ? t.clientX : s.lastX);
    };
    const cancel = () => {
      stop();
      if (g.current?.sideways) settle();
      else g.current = null;
    };
    const stop = () => {
      window.removeEventListener("touchmove", moveT);
      window.removeEventListener("touchend", endT);
      window.removeEventListener("touchcancel", cancel);
    };
    const start = (e: TouchEvent) => {
      unstick();
      if (e.touches.length !== 1) return (g.current = null);
      const t = e.touches[0];
      begin(t.clientX, t.clientY, e.target, t.identifier);
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
  }, [main]);

  /** Safety net: a page left out of place (no swipe or animation running) springs back on the next touch. */
  const unstick = () => {
    if (!g.current && !x.isAnimating() && Math.abs(x.get()) > 0.5) settle();
  };

  /** Call after the tab has changed (in a layout effect): slides the new screen in, or fades it in after a tab tap. */
  const enter = () => {
    const dir = incoming.current;
    incoming.current = 0;
    if (reduce) {
      x.jump(0);
      opacity.jump(1);
      return;
    }
    if (dir) {
      x.jump(dir * Math.min(140, window.innerWidth * 0.35));
      opacity.jump(0.85);
      animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
      animate(opacity, 1, { duration: 0.2 });
    } else {
      x.jump(0);
      opacity.jump(0.5);
      animate(opacity, 1, { duration: 0.14, ease: "easeOut" });
    }
  };

  // A mouse or pen (a computer, or the tests) uses pointer events; touch is handled above.
  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      unstick();
      begin(e.clientX, e.clientY, e.target, e.pointerId);
    },
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType === "touch" || g.current?.id !== e.pointerId) return;
      const was = g.current.sideways;
      // Once it's a page turn, keep the pointer even if it leaves the screen (taps never get here).
      if (move(e.clientX, e.clientY) && !was) (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    },
    onPointerUp: (e: PointerEvent) => {
      if (e.pointerType === "touch" || g.current?.id !== e.pointerId) return;
      end(e.clientX);
    },
    onPointerCancel: (e: PointerEvent) => {
      if (e.pointerType !== "touch" && g.current?.sideways) settle();
    },
    onLostPointerCapture: (e: PointerEvent) => {
      // The release happened somewhere we couldn't see: finish as if let go where it last was.
      if (e.pointerType !== "touch" && g.current?.id === e.pointerId && g.current.sideways) end(g.current.lastX);
    },
    // A sideways swipe isn't also a tap on whatever it started on.
    onClickCapture: (e: MouseEvent) => {
      if (swiped.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };

  return { x, opacity, handlers, enter };
}
