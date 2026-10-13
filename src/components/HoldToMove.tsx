import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { useDragControls } from "motion/react";
import { haptic } from "./ui";

/** How long to hold before a card lifts and can be dragged. A quick swipe still scrolls the page. */
const HOLD_MS = 350;

/**
 * Press and hold, then drag, to put something in another place (with motion's Reorder.Item).
 * A tap still works as a tap; Alt + ↑/↓ moves it from the keyboard.
 */
export function useHoldToMove(onKeyMove?: (step: -1 | 1) => void) {
  const controls = useDragControls();
  const [moving, setMoving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | null>(null);
  // A hold isn't a tap: swallow the click that follows letting go.
  const held = useRef(false);

  const cancel = () => {
    clearTimeout(timer.current);
    origin.current = null;
  };
  useEffect(() => cancel, []);
  useEffect(() => {
    if (!moving) return;
    // Keep the page still while a card is being dragged.
    const still = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", still, { passive: false });
    return () => document.removeEventListener("touchmove", still);
  }, [moving]);

  const bind = {
    onPointerDown: (e: PointerEvent) => {
      // A card inside another one (an exercise in a day) moves on its own.
      e.stopPropagation();
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const start = e.nativeEvent;
      origin.current = { x: e.clientX, y: e.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        origin.current = null;
        held.current = true;
        setMoving(true);
        haptic();
        controls.start(start);
      }, HOLD_MS);
    },
    onPointerMove: (e: PointerEvent) => {
      const o = origin.current;
      // Moved before the hold finished: it's a scroll, not a move.
      if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 8) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
    onClickCapture: (e: MouseEvent) => {
      if (!held.current) return;
      held.current = false;
      e.stopPropagation();
      e.preventDefault();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (!onKeyMove || !e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      e.preventDefault();
      e.stopPropagation();
      onKeyMove(e.key === "ArrowUp" ? -1 : 1);
    },
  };

  const end = () => {
    setMoving(false);
    // The click (if any) comes right after letting go; after that, taps work again.
    setTimeout(() => (held.current = false), 80);
  };

  return { controls, bind, moving, end };
}

/** Lifted look while a card is being moved. */
export const LIFTED = { scale: 1.02, boxShadow: "0 14px 34px rgba(0, 0, 0, 0.22)", zIndex: 5 };
