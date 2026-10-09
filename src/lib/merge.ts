import type { AppState } from "./store";

type Collection = "log" | "customFoods" | "customMeals" | "sessions" | "weights" | "days";
const COLLECTIONS: Collection[] = ["log", "customFoods", "customMeals", "sessions", "weights", "days"];
const SCALARS = ["profile", "split", "tourDone", "activeSessionId", "recentFoodIds", "theme", "introDone", "language", "reminders", "coach"] as const;

const stamp = (s: AppState, k: keyof AppState) => s.stamps?.[k] ?? 0;

type Item = { id: string; updatedAt?: number; createdAt?: number; startedAt?: number; endedAt?: number };
const created = (i: Item) => i.createdAt ?? i.startedAt ?? i.updatedAt ?? 0;

/** The better of two copies of the same item: the newer edit, else a finished workout, else the fresher list's copy. */
function pick(a: Item, b: Item): Item {
  if ((a.updatedAt ?? 0) !== (b.updatedAt ?? 0)) return (a.updatedAt ?? 0) > (b.updatedAt ?? 0) ? a : b;
  if (!!a.endedAt !== !!b.endedAt) return a.endedAt ? a : b;
  return a;
}

/**
 * Combines two copies of the app data (this phone and the cloud) without losing work:
 * - lists (food log, workouts, custom foods and meals) are joined by ID; deleted IDs stay deleted;
 *   an entry present on both sides keeps its most recent edit;
 * - single settings (profile, split, …) come from whichever side changed them last;
 * - after "Delete all data", anything from before the reset is dropped on every phone.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const deleted = Array.from(new Set([...(remote.deleted ?? []), ...(local.deleted ?? [])])).slice(-2000);
  const gone = new Set(deleted);
  const resetAt = Math.max(local.resetAt ?? 0, remote.resetAt ?? 0);
  const out = { ...local, deleted, resetAt: resetAt || undefined, stamps: { ...remote.stamps, ...local.stamps } } as AppState;

  for (const key of COLLECTIONS) {
    const localNewer = stamp(local, key) >= stamp(remote, key);
    const sides = (localNewer ? [local, remote] : [remote, local])
      // A copy of the list last changed before the reset is entirely pre-reset data.
      .filter((side) => !resetAt || stamp(side, key) >= resetAt);
    const byId = new Map<string, Item>();
    for (const side of sides) {
      for (const item of (side[key] ?? []) as Item[]) {
        if (gone.has(item.id) || (resetAt && created(item) && created(item) < resetAt)) continue;
        const have = byId.get(item.id);
        byId.set(item.id, have ? pick(have, item) : item);
      }
    }
    (out as unknown as Record<Collection, unknown[]>)[key] = [...byId.values()];
    out.stamps[key] = Math.max(stamp(local, key), stamp(remote, key));
  }
  out.log.sort((a, b) => a.createdAt - b.createdAt);
  out.sessions.sort((a, b) => b.startedAt - a.startedAt);
  // One weigh-in per day: if two phones logged the same day, keep the later one.
  const byDate = new Map<string, AppState["weights"][number]>();
  for (const w of out.weights) if ((byDate.get(w.date)?.createdAt ?? -1) < w.createdAt) byDate.set(w.date, w);
  out.weights = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  out.days.sort((a, b) => a.id.localeCompare(b.id));

  for (const key of SCALARS) {
    const src = stamp(remote, key) > stamp(local, key) ? remote : local;
    (out as unknown as Record<string, unknown>)[key] = src[key];
    out.stamps[key] = Math.max(stamp(local, key), stamp(remote, key));
  }
  // Never keep a workout running if it was deleted or doesn't exist here.
  if (out.activeSessionId && !out.sessions.some((s) => s.id === out.activeSessionId && !s.endedAt)) out.activeSessionId = null;
  // Once onboarded anywhere, stay onboarded (unless that was before a reset).
  const onboardedSince = (side: AppState) => side.profile.onboarded && stamp(side, "profile") >= resetAt;
  if (onboardedSince(local) || onboardedSince(remote)) out.profile = { ...out.profile, onboarded: true };
  return out;
}
