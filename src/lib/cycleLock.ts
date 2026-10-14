import { useSyncExternalStore } from "react";
import { getState, useStore } from "./store";

// Privacy lock for the cycle section on a shared phone: a 4-digit PIN. Once opened it stays open
// for five minutes, or until the app goes to the background or someone else's profile is used.

const OPEN_MS = 5 * 60_000;
let openFor: { person: string; until: number } | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** The PIN as stored: a SHA-256 hash, salted with the person's id, never the digits themselves. */
export async function hashPin(pin: string, person: string): Promise<string> {
  const data = new TextEncoder().encode(`w-cycle:${person}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function unlock(pin: string): Promise<boolean> {
  const s = getState();
  const want = s.profile.cycle.pin;
  if (!want) return true;
  if ((await hashPin(pin, s.personId)) !== want) return false;
  openFor = { person: s.personId, until: Date.now() + OPEN_MS };
  notify();
  return true;
}

export function lockNow() {
  openFor = null;
  notify();
}

const isOpen = (person: string) => !!openFor && openFor.person === person && openFor.until > Date.now();

if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => document.hidden && lockNow());

const subscribe = (l: () => void) => {
  listeners.add(l);
  // Re-check now and then so it closes on its own after five minutes.
  const id = setInterval(l, 30_000);
  return () => {
    listeners.delete(l);
    clearInterval(id);
  };
};

/** True when cycle details can be shown: no PIN set, or opened with it recently. */
export function useCycleOpen(): boolean {
  const pin = useStore((s) => s.profile.cycle.pin);
  const person = useStore((s) => s.personId);
  const open = useSyncExternalStore(subscribe, () => isOpen(person), () => false);
  return !pin || open;
}
