import type { AppState } from "./store";

type Collection = "log" | "customFoods" | "customMeals" | "sessions";
const COLLECTIONS: Collection[] = ["log", "customFoods", "customMeals", "sessions"];
const SCALARS = ["profile", "split", "tourDone", "activeSessionId", "recentFoodIds", "theme", "introDone"] as const;

const stamp = (s: AppState, k: keyof AppState) => s.stamps?.[k] ?? 0;

/**
 * Combines two copies of the app data (this phone and the cloud) without losing work:
 * - lists (food log, workouts, custom foods and meals) are joined by ID; deleted IDs stay deleted;
 *   an entry present on both sides comes from the side that changed that list most recently;
 * - single settings (profile, split, …) come from whichever side changed them last.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const deleted = Array.from(new Set([...(remote.deleted ?? []), ...(local.deleted ?? [])])).slice(-2000);
  const gone = new Set(deleted);
  const out = { ...local, deleted, stamps: { ...remote.stamps, ...local.stamps } } as AppState;

  for (const key of COLLECTIONS) {
    const localNewer = stamp(local, key) >= stamp(remote, key);
    const [first, second] = localNewer ? [local[key], remote[key]] : [remote[key], local[key]];
    const byId = new Map<string, unknown>();
    for (const item of [...(first ?? []), ...(second ?? [])] as { id: string }[]) {
      if (!gone.has(item.id) && !byId.has(item.id)) byId.set(item.id, item);
    }
    (out as unknown as Record<Collection, unknown[]>)[key] = [...byId.values()];
    out.stamps[key] = Math.max(stamp(local, key), stamp(remote, key));
  }
  out.log.sort((a, b) => a.createdAt - b.createdAt);
  out.sessions.sort((a, b) => b.startedAt - a.startedAt);

  for (const key of SCALARS) {
    const src = stamp(remote, key) > stamp(local, key) ? remote : local;
    (out as unknown as Record<string, unknown>)[key] = src[key];
    out.stamps[key] = Math.max(stamp(local, key), stamp(remote, key));
  }
  // Never keep a workout running if it was deleted or doesn't exist here.
  if (out.activeSessionId && !out.sessions.some((s) => s.id === out.activeSessionId && !s.endedAt)) out.activeSessionId = null;
  // Once onboarded anywhere, stay onboarded.
  if (local.profile.onboarded || remote.profile.onboarded) out.profile = { ...out.profile, onboarded: true };
  return out;
}
