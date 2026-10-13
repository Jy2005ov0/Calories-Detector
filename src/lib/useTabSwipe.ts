import { useRef, type MouseEvent, type PointerEvent } from "react";
import { animate, useMotionValue } from "motion/react";

/**
 * Swipe left or right anywhere on a screen to go to the next or previous tab. The screen follows
 * the finger, so it feels like turning a page; a short or mostly vertical swipe just scrolls.
 * Things that use a sideways drag themselves (chip rows, swipe-to-delete rows, press-and-hold
 * cards, the sleep clock, sliders and text fields) keep it.
 */
const OWN_GESTURE = ".chips, .swipe-row, .hold-move, .sleep-clock, .water-cup-btn, [role=slider], input, textarea, select, [data-no-swipe]";

export function useTabSwipe<T extends string>(tabs: readonly T[], tab: T, setTab: (t: T, dir: 1 | -1) => void, enabled = true) {
  const x = useMotionValue(0);
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const sideways = useRef(false);
  const swiped = useRef(false);
  const i = tabs.indexOf(tab);

  const reset = () => {
    start.current = null;
    sideways.current = false;
    animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
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
        if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
        sideways.current = true;
      }
      // Rubber-band past the first and last tab.
      const edge = (dx > 0 && i === 0) || (dx < 0 && i === tabs.length - 1);
      x.set(edge ? dx * 0.2 : dx * 0.6);
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      if (!s || !sideways.current || e.pointerId !== s.id) return reset();
      const dx = e.clientX - s.x;
      const speed = dx / Math.max(1, performance.now() - s.t);
      const dir = dx < 0 ? 1 : -1;
      const next = i + dir;
      start.current = null;
      sideways.current = false;
      swiped.current = true;
      setTimeout(() => (swiped.current = false), 80);
      if ((Math.abs(dx) > 70 || Math.abs(speed) > 0.5) && next >= 0 && next < tabs.length) {
        x.set(0);
        setTab(tabs[next], dir);
      } else reset();
    },
    onPointerCancel: reset,
    // A sideways swipe isn't also a tap on whatever it started on.
    onClickCapture: (e: MouseEvent) => {
      if (swiped.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };

  return { x, handlers };
}
