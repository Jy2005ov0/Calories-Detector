import { useRef, type MouseEvent, type PointerEvent } from "react";
import { animate, useMotionValue, useReducedMotion } from "motion/react";

/**
 * Swipe left or right anywhere on a screen to go to the next or previous tab. The screen follows
 * the finger one to one; let go past the threshold and it carries on off the screen while the next
 * one slides in (the screens are kept ready, so nothing has to be built mid-swipe). A short or
 * mostly vertical swipe just scrolls. Things that use a sideways drag themselves (chip rows,
 * swipe-to-delete rows, press-and-hold cards, the sleep clock, sliders and text fields) keep it.
 */
const OWN_GESTURE = ".chips, .swipe-row, .hold-move, .sleep-clock, .water-cup-btn, [role=slider], input, textarea, select, [data-no-swipe]";

export function useTabSwipe<T extends string>(tabs: readonly T[], tab: T, setTab: (t: T) => void, enabled = true) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const sideways = useRef(false);
  const swiped = useRef(false);
  // Which side the next screen comes in from, set by a swipe and used once it's showing.
  const incoming = useRef<0 | 1 | -1>(0);
  const i = tabs.indexOf(tab);

  const settle = () => {
    start.current = null;
    sideways.current = false;
    animate(x, 0, { type: "spring", bounce: 0, duration: 0.28 });
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

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (!enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      if ((e.target as Element).closest(OWN_GESTURE)) return;
      start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      sideways.current = false;
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!sideways.current) {
        // Decide once: clearly sideways is a page turn, anything else is a scroll.
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return (start.current = null);
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        sideways.current = true;
        // A page turn never selects the text it passes over.
        document.getSelection()?.removeAllRanges();
      }
      // Follow the finger; past the first and last tab, rubber-band.
      const edge = (dx > 0 && i === 0) || (dx < 0 && i === tabs.length - 1);
      x.set(edge ? dx * 0.25 : dx);
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      if (!s || !sideways.current || e.pointerId !== s.id) return settle();
      const dx = e.clientX - s.x;
      const speed = dx / Math.max(1, performance.now() - s.t);
      const dir: 1 | -1 = dx < 0 ? 1 : -1;
      const next = i + dir;
      start.current = null;
      sideways.current = false;
      swiped.current = true;
      setTimeout(() => (swiped.current = false), 80);
      if (!((Math.abs(dx) > 70 || Math.abs(speed) > 0.45) && next >= 0 && next < tabs.length)) return settle();
      // Carry on off the screen in the same direction, then show the next one.
      const w = window.innerWidth;
      const go = () => {
        incoming.current = dir;
        setTab(tabs[next]);
      };
      if (reduce) return go();
      void animate(x, -dir * w, { duration: 0.14, ease: [0.4, 0, 1, 1] }).then(go);
    },
    onPointerCancel: settle,
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
