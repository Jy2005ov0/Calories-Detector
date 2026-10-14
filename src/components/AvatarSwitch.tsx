import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { ChevronDown } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { t, useLanguage } from "../i18n";
import { useStore } from "../lib/store";
import { PersonAvatar, nameOf, switchTo } from "./People";
import { haptic } from "./ui";

/** How far the photo comes down (after resistance) before letting go switches person. */
const ARM = 34;
const MAX = 52;
const DECIDE_PX = 6;
const rubber = (d: number) => (d <= 0 ? 0 : Math.min(MAX, d * 0.6));

/**
 * The profile photo on Today. Tap it to see everyone; with more than one person on the phone,
 * swipe it down to switch to the next one: the photo follows the finger and fades while the next
 * person's photo drops into its place, and letting go past the line makes the switch.
 */
export function AvatarSwitch({ id, name, photo, onOpen }: { id: string; name: string; photo?: string; onOpen: () => void }) {
  useLanguage();
  const reduce = useReducedMotion();
  const next = useStore((s) => s.people.find((p) => p.data.profile.onboarded));
  const pull = useMotionValue(0);
  const [pulling, setPulling] = useState(false);
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const g = useRef<{ y: number; id: number; pulling: boolean } | null>(null);
  const busy = useRef(false);
  // A swipe isn't also a tap.
  const swallow = useRef(false);

  const curY = useTransform(pull, (v) => v * 0.9);
  const curOpacity = useTransform(pull, [0, ARM, MAX], [1, 0.3, 0.15]);
  const curScale = useTransform(pull, [0, ARM], [1, 0.8]);
  const nextY = useTransform(pull, [0, ARM, MAX], [-26, 0, 4]);
  const nextOpacity = useTransform(pull, [0, 10, ARM], [0, 0.5, 1]);
  const nextScale = useTransform(pull, [0, ARM], [0.6, 1]);

  const setArm = (on: boolean) => {
    if (armedRef.current === on) return;
    armedRef.current = on;
    setArmed(on);
    if (on) haptic("light");
  };
  const back = () => {
    setArm(false);
    void animate(pull, 0, { type: "spring", bounce: 0.25, duration: 0.35 }).then(() => !g.current && setPulling(false));
  };

  const finish = async () => {
    const person = next;
    if (!armedRef.current || !person) return back();
    busy.current = true;
    if (!reduce) await animate(pull, MAX, { type: "spring", bounce: 0, duration: 0.18 });
    const ok = switchTo(person.id, person.data.profile.name);
    haptic(ok ? "success" : "light");
    setArm(false);
    // Switched: the next person's photo is now this one, already in place. Not switched: spring back.
    if (ok) pull.jump(0);
    else await animate(pull, 0, { type: "spring", bounce: 0.25, duration: 0.35 });
    setPulling(false);
    busy.current = false;
  };

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (!next || busy.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      g.current = { y: e.clientY, id: e.pointerId, pulling: false };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: PointerEvent) => {
      const s = g.current;
      if (!s || s.id !== e.pointerId) return;
      const dy = e.clientY - s.y;
      if (!s.pulling) {
        if (dy < DECIDE_PX) return;
        s.pulling = true;
        swallow.current = true;
        setPulling(true);
      }
      const d = rubber(dy);
      pull.set(d);
      setArm(d >= ARM);
    },
    onPointerUp: (e: PointerEvent) => {
      const s = g.current;
      if (!s || s.id !== e.pointerId) return;
      g.current = null;
      if (s.pulling) void finish();
    },
    onPointerCancel: () => {
      const s = g.current;
      g.current = null;
      if (s?.pulling) back();
    },
    // Let go somewhere we couldn't see (off the window): put the photo back.
    onLostPointerCapture: (e: PointerEvent) => {
      const s = g.current;
      if (s?.id !== e.pointerId) return;
      g.current = null;
      if (s.pulling) back();
    },
    onClick: (e: MouseEvent) => {
      if (swallow.current) {
        swallow.current = false;
        e.preventDefault();
        return;
      }
      onOpen();
    },
  };
  // A tap that never moved resets the "was a swipe" flag for the next one.
  const onDown = (e: PointerEvent) => {
    swallow.current = false;
    handlers.onPointerDown(e);
  };

  const nextName = next ? nameOf(next.data.profile.name) : "";
  return (
    <button
      className={`avatar-switch pressable${next ? " can-switch" : ""}`}
      data-no-swipe
      {...handlers}
      onPointerDown={onDown}
      onDragStart={(e) => e.preventDefault()}
      aria-label={t("Switch person")}
      aria-description={next ? t("Swipe down to switch to {name}", { name: nextName }) : undefined}
      data-testid="avatar-switch"
    >
      <span className="avatar-switch-stack">
        <motion.span className="avatar-switch-cur" style={{ y: curY, opacity: curOpacity, scale: curScale }}>
          <PersonAvatar id={id} name={name} photo={photo} size={36} />
        </motion.span>
        {next && pulling && (
          <motion.span className="avatar-switch-next" style={{ y: nextY, opacity: nextOpacity, scale: nextScale }} aria-hidden>
            <PersonAvatar id={next.id} name={next.data.profile.name} photo={next.data.profile.photo} size={36} />
          </motion.span>
        )}
      </span>
      {next && !pulling && (
        <span className="avatar-switch-hint" aria-hidden>
          <ChevronDown size={10} strokeWidth={3} />
        </span>
      )}
      {next && pulling && (
        <span className={`avatar-switch-pill${armed ? " armed" : ""}`} aria-hidden data-testid="avatar-switch-pill">
          {armed ? t("Let go for {name}", { name: nextName }) : nextName}
        </span>
      )}
    </button>
  );
}
