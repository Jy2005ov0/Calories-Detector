import { useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";

/**
 * Swipe left or right anywhere on a screen to go to the next or previous tab, like turning pages:
 * the screens either side are laid out ahead of time just off the edge, so the next one moves in
 * with your finger, one to one, and letting go past the threshold (or with a flick) simply carries
 * on until it's in place. Nothing has to be built or drawn at the moment the page turns. Swipe-to-delete rows, the sleep clock, sliders and text
 * fields keep their own sideways drag; a chip row scrolls until it reaches its end; and a quick
 * swipe on something you press and hold (plan cards, the water cup) still turns the page.
 *
 * Fingers are handled with touch events, not pointer events: the moment a touch starts moving the
 * app decides whether it's a sideways swipe (and then stops the browser scrolling) or a scroll
 * (and then lets go). With pointer events the browser grabbed any swipe that wasn't almost flat as
 * a scroll and cancelled it, so swipes failed "sometimes", and almost always on long lists.
 */
const OWN_GESTURE = ".sheet, .scrim, .swipe-row, .sleep-clock, [role=slider], input, textarea, select, [data-no-swipe]";
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


/** Which side the next screen comes from after a page turn: already in place, or (no ready page) slid in. */
type Incoming = "none" | "placed" | 1 | -1;

/**
 * `pages` holds each tab's page element. The current one is in the page as usual; its neighbours
 * (marked `data-ready` once built) sit fixed just off each edge, hidden until a swipe shows one.
 */
export function useTabSwipe<T extends string>(
  main: RefObject<HTMLElement | null>,
  pages: RefObject<Partial<Record<T, HTMLElement | null>>>,
  tabs: readonly T[],
  tab: T,
  setTab: (t: T) => void,
  enabled = true,
) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const g = useRef<Gesture | null>(null);
  // If a swipe stops hearing from the finger (the thing it started on was removed mid-swipe, so the
  // browser sends the rest of its events nowhere we can see), put the page back rather than leave it.
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const swiped = useRef(false);
  const incoming = useRef<Incoming>("none");
  // The neighbour being shown, if any.
  const peeked = useRef<HTMLElement | null>(null);
  // Read inside the native listeners, which are added once.
  const live = useRef({ tabs, tab, setTab, enabled, reduce });
  live.current = { tabs, tab, setTab, enabled, reduce };

  const width = () => main.current?.clientWidth || window.innerWidth;
  const pageAt = (offset: number) => {
    const { tabs, tab } = live.current;
    const id = tabs[tabs.indexOf(tab) + offset];
    return id === undefined ? null : (pages.current[id] ?? null);
  };
  const ready = (el: HTMLElement | null) => !!el && el.dataset.ready !== undefined;

  /** Moves the current page and its neighbours together; straight on the elements, every frame. */
  const place = (v: number) => {
    const w = width();
    const cur = pageAt(0);
    if (cur) cur.style.transform = v ? `translate3d(${v}px,0,0)` : "";
    const left = pageAt(-1);
    const right = pageAt(1);
    if (left) left.style.transform = `translate3d(${v - w}px,0,0)`;
    if (right) right.style.transform = `translate3d(${v + w}px,0,0)`;
  };
  useEffect(() => x.on("change", place), [x]); // eslint-disable-line react-hooks/exhaustive-deps

  const peek = (el: HTMLElement | null) => {
    if (peeked.current === el) return;
    peeked.current?.removeAttribute("data-peek");
    peeked.current = el;
    if (!el) return;
    place(x.get());
    el.setAttribute("data-peek", "");
  };
  /** Back at rest: hide the neighbours and let the glass blur come back. */
  const rest = () => {
    peek(null);
    document.documentElement.classList.remove("swiping");
  };

  const settle = () => {
    clearTimeout(watchdog.current);
    g.current = null;
    void animate(x, 0, { type: "spring", bounce: 0, duration: 0.28 }).then(() => !g.current && x.get() === 0 && rest());
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
      // A page turn never selects the text it passes over, and the glass blur rests while it moves.
      document.getSelection()?.removeAllRanges();
      document.documentElement.classList.add("swiping");
    }
    s.prevX = s.lastX;
    s.prevT = s.lastT;
    s.lastX = cx;
    s.lastT = performance.now();
    clearTimeout(watchdog.current);
    watchdog.current = setTimeout(() => g.current === s && settle(), 800);
    // Show the page coming in (if it's ready); past the first and last tab, rubber-band.
    const side = pageAt(dx < 0 ? 1 : -1);
    peek(ready(side) ? side : null);
    x.set(side ? dx : dx * 0.25);
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
    const w = width();
    const far = Math.abs(dx) > Math.min(90, w * 0.22);
    const flick = Math.abs(speed) > 0.4 && Math.sign(speed) === Math.sign(dx) && Math.abs(dx) > 30;
    if (!(far || flick) || next < 0 || next >= tabs.length) return settle();
    const placed = ready(pageAt(dir)) && !reduce;
    const go = () => {
      incoming.current = placed ? "placed" : dir;
      setTab(tabs[next]);
    };
    if (reduce) return go();
    // Carry on, at the finger's speed, until the next page is in place (or, if it isn't built yet,
    // off the screen so it can slide in).
    const velocity = Math.sign(speed) === -dir ? speed * 1000 : 0;
    const to = animate(x, -dir * w, placed ? { type: "spring", bounce: 0, duration: 0.32, velocity, restDelta: 0.5 } : { duration: 0.14, ease: [0.4, 0, 1, 1] });
    void to.then(go);
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

  /**
   * Call after the tab has changed (in a layout effect, before the screen is drawn). After a page
   * turn the new screen is already in place; a screen that wasn't built yet slides in; a tab tap
   * just shows it.
   */
  const enter = () => {
    const how = incoming.current;
    incoming.current = "none";
    g.current = null;
    rest();
    if (how === "none" || how === "placed" || reduce) {
      x.jump(0);
      place(0);
      return;
    }
    x.jump(how * Math.min(140, width() * 0.35));
    animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
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

  return { handlers, enter };
}
