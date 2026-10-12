import { registerPlugin } from "@capacitor/core";
import { CapacitorPedometer } from "@capgo/capacitor-pedometer";
import { useEffect } from "react";
import { isNative, platform } from "./platform";
import { addDays } from "./progress";
import { actions, getState, useStore } from "./store";

// Steps come from the phone's own motion sensor, no Apple Health or Google Fit needed.
// iPhone (Core Motion) keeps a history we can ask for any day of the past week.
// Android's step sensor only gives a running total since the phone was switched on, so W
// remembers that total and works out each day's steps from it, even while W is closed.

interface WNativePlugin {
  stepTotal(): Promise<{ available: boolean; permission?: boolean; total?: number }>;
  updateWidget(o: { json: string }): Promise<void>;
  takeWidgetWater(): Promise<{ ml: number; date: string }>;
}
export const WNative = registerPlugin<WNativePlugin>("WNative");

/** Calories burned walking: about 0.5 kcal per kg of body weight per 1,000 steps. */
export const stepKcal = (steps: number, weightKg: number) => steps * weightKg * 0.0005;

export const DEFAULT_STEP_GOAL = 10000;

/** Whether this device can count steps (phone apps only; tests can pretend with window.__wSteps). */
export const stepsSupported = () => isNative || typeof (globalThis as { __wSteps?: number }).__wSteps === "number";

/** Ask for motion permission. False if refused or there's no step sensor. */
export async function enableSteps(): Promise<boolean> {
  if (!isNative) return stepsSupported();
  try {
    const avail = await CapacitorPedometer.isAvailable();
    if (!avail.stepCounting) return false;
    const perm = await CapacitorPedometer.requestPermissions();
    return perm.activityRecognition === "granted";
  } catch {
    return false;
  }
}

const startOfDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
};

interface AndroidBase {
  /** Total at the last reading, when it was taken, and the total at the start of that reading's day. */
  total: number;
  at: number;
  day: string;
  base: number;
}
const BASE_KEY = "w:steps-base";

/**
 * Today's steps from Android's running total. The first reading of a new day splits the steps
 * walked since the last reading between yesterday and today by time, the best guess available.
 * After a restart the total starts again from zero.
 */
export function androidDaySteps(prev: AndroidBase | null, total: number, now: number, today: string): { steps: number; next: AndroidBase; yesterday?: number } {
  if (!prev) return { steps: 0, next: { total, at: now, day: today, base: total } };
  let { base } = prev;
  let prevTotal = prev.total;
  if (total < prevTotal) {
    // Phone restarted: the counter began again at 0.
    base -= prevTotal;
    prevTotal = 0;
  }
  if (prev.day === today) return { steps: total - base, next: { total, at: now, day: today, base } };
  const midnight = startOfDay(today);
  const walked = total - prevTotal;
  const share = now > prev.at ? Math.max(0, Math.min(1, (now - midnight) / (now - prev.at))) : 1;
  const todayPart = Math.round(walked * share);
  const yesterday = prev.day === addDays(today, -1) ? prevTotal - base + (walked - todayPart) : undefined;
  const newBase = total - todayPart;
  return { steps: todayPart, next: { total, at: now, day: today, base: newBase }, yesterday };
}

/** Read today's steps (and, on iPhone, fill in the past week). */
export async function readSteps(today: string): Promise<void> {
  const mock = (globalThis as { __wSteps?: number }).__wSteps;
  if (!isNative) {
    if (typeof mock === "number") actions.setSteps(today, mock);
    return;
  }
  try {
    if (platform === "ios") {
      const now = Date.now();
      for (let i = 0; i < 7; i++) {
        const day = addDays(today, -i);
        const start = startOfDay(day);
        const end = i === 0 ? now : startOfDay(addDays(day, 1)) - 1;
        const m = await CapacitorPedometer.getMeasurement({ start, end });
        if (typeof m.numberOfSteps === "number" && (i === 0 || m.numberOfSteps > 0)) actions.setSteps(day, Math.round(m.numberOfSteps));
      }
      return;
    }
    const r = await WNative.stepTotal();
    if (!r.available || !r.permission || typeof r.total !== "number") return;
    let prev: AndroidBase | null = null;
    try {
      prev = JSON.parse(localStorage.getItem(BASE_KEY) ?? "null");
    } catch {
      prev = null;
    }
    const { steps, next, yesterday } = androidDaySteps(prev, r.total, Date.now(), today);
    localStorage.setItem(BASE_KEY, JSON.stringify(next));
    if (yesterday !== undefined && yesterday >= 0) actions.setSteps(addDays(today, -1), Math.max(yesterday, getState().days.find((d) => d.id === addDays(today, -1))?.steps ?? 0));
    actions.setSteps(today, Math.max(0, steps));
  } catch {
    /* no sensor or no permission: leave steps as they are */
  }
}

/** Keep today's steps fresh while the app is open (every minute, and when it comes back to the front). */
export function useStepUpdates(today: string) {
  const on = useStore((s) => !!s.profile.stepsOn);
  useEffect(() => {
    if (!on) return;
    readSteps(today);
    const timer = setInterval(() => readSteps(today), 60_000);
    const onShow = () => document.visibilityState === "visible" && readSteps(today);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [on, today]);
}
