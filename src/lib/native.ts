import { LocalNotifications, type LocalNotificationSchema } from "@capacitor/local-notifications";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { t } from "../i18n";
import { buildPlan, sessionFromPlan, sessionKcal } from "./fitness";
import { isNative, platform } from "./platform";
import { cycleOf, cycleStatus } from "./cycle";
import { minutesOf } from "./progress";
import { actions, getState, subscribe, todayKey, weekdayOf, type AppState } from "./store";

// ── Notifications ────────────────────────────────────────
// Reminders, the rest timer and the running workout are local notifications. On a paired
// Apple Watch or Wear OS watch the phone's notifications appear on the wrist with their
// action buttons, so "Clock in" and "Clock out" work from the watch.

const ID = { meal: 1000, water: 1100, gym: 1200, workout: 2000, rest: 3000, period: 4000 };
const GYM_TYPE = "GYM_REMINDER";
const WORKOUT_TYPE = "WORKOUT_RUNNING";

let ready: Promise<boolean> | null = null;

/** Ask for notification permission once and register the action buttons. */
export function notificationsReady(): Promise<boolean> {
  if (!isNative) return Promise.resolve(false);
  ready ??= (async () => {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") return false;
      await LocalNotifications.registerActionTypes({
        types: [
          { id: GYM_TYPE, actions: [{ id: "clock-in", title: t("Clock in"), foreground: false }] },
          { id: WORKOUT_TYPE, actions: [{ id: "clock-out", title: t("Clock out"), foreground: false, destructive: true }] },
        ],
      });
      if (platform === "android") {
        await LocalNotifications.createChannel({ id: "reminders", name: t("Reminders"), importance: 4, vibration: true });
        await LocalNotifications.createChannel({ id: "workout", name: t("Workout"), importance: 3, vibration: false });
      }
      return true;
    } catch {
      return false;
    }
  })();
  return ready;
}

const hm = (hhmm: string, shift = 0) => {
  const m = (minutesOf(hhmm) + shift + 1440) % 1440;
  return { hour: Math.floor(m / 60), minute: m % 60 };
};
// Capacitor weekdays run Sunday = 1 … Saturday = 7; the plan uses Monday = 0.
const capWeekday = (mon0: number) => ((mon0 + 1) % 7) + 1;

function reminderSchedule(s: AppState): LocalNotificationSchema[] {
  const r = s.reminders;
  const p = s.profile;
  const list: LocalNotificationSchema[] = [];
  const daily = (id: number, title: string, body: string, time: { hour: number; minute: number }, extra?: Partial<LocalNotificationSchema>) =>
    list.push({ id, title, body, channelId: "reminders", schedule: { on: time, repeats: true, allowWhileIdle: true }, ...extra });

  if (r.meals) {
    if (p.fasting === "ramadan") {
      daily(ID.meal, t("Sahur"), t("Sahur ends at {time}. Eat slow carbs and protein, and drink water.", { time: p.fastTimes.sahur }), hm(p.fastTimes.sahur, -45));
      daily(ID.meal + 1, t("Iftar"), t("Break your fast with water and dates, then log your meal."), hm(p.fastTimes.iftar));
    } else {
      daily(ID.meal, t("Breakfast"), t("Log your breakfast to stay on track."), hm(r.breakfast));
      daily(ID.meal + 1, t("Lunch"), t("What's for lunch? Snap a photo to log it."), hm(r.lunch));
      daily(ID.meal + 2, t("Dinner"), t("Log your dinner and see what's left for today."), hm(r.dinner));
    }
  }
  if (r.water) {
    // Every two hours while awake; during Ramadan only between iftar and sahur.
    const hours = p.fasting === "ramadan" ? [20, 21, 22, 23] : [9, 11, 13, 15, 17, 19, 21];
    hours.forEach((h, i) => daily(ID.water + i, t("Drink water"), t("Time for a glass of water."), { hour: h, minute: 0 }));
  }
  if (r.gym) {
    const plan = buildPlan(p, s.split);
    for (const d of plan.days) {
      list.push({
        id: ID.gym + d.weekday,
        title: t("{title} today", { title: t(d.title) }),
        body: t("Ready to train? Tap Clock in to start the timer."),
        channelId: "reminders",
        actionTypeId: GYM_TYPE,
        extra: { kind: "gym" },
        schedule: { on: { weekday: capWeekday(d.weekday), ...hm(r.gymTime) }, repeats: true, allowWhileIdle: true },
      });
    }
  }
  const c = cycleOf(p);
  const cycle = c.on && c.remind ? cycleStatus(c, s.periods ?? [], todayKey()) : null;
  if (cycle) {
    // 9 am two days before, and on the day it's expected.
    const at = (daysBefore: number) => {
      const [y, m, d] = cycle.nextStart.split("-").map(Number);
      return new Date(y, m - 1, d - daysBefore, 9, 0);
    };
    const soon = at(2);
    if (soon.getTime() > Date.now())
      list.push({ id: ID.period, title: t("Period expected in 2 days"), body: t("Pack what you need. Lighter training is fine if you feel tired."), channelId: "reminders", schedule: { at: soon, allowWhileIdle: true } });
    const due = at(0);
    if (due.getTime() > Date.now())
      list.push({ id: ID.period + 1, title: t("Period due today"), body: t("If it started, log it in W so predictions stay accurate."), channelId: "reminders", schedule: { at: due, allowWhileIdle: true } });
  }
  return list;
}

const allReminderIds = () =>
  [...Array(3).keys()]
    .map((i) => ID.meal + i)
    .concat([...Array(7).keys()].map((i) => ID.water + i), [...Array(7).keys()].map((i) => ID.gym + i), [ID.period, ID.period + 1]);

/** Replace scheduled reminders with what the current settings call for. */
export async function syncReminders(s: AppState = getState()) {
  if (!isNative) return;
  const wanted = reminderSchedule(s);
  const any = s.reminders.meals || s.reminders.water || s.reminders.gym || (cycleOf(s.profile).on && s.profile.cycle.remind);
  if (any && !(await notificationsReady())) return;
  try {
    await LocalNotifications.cancel({ notifications: allReminderIds().map((id) => ({ id })) });
    if (wanted.length) await LocalNotifications.schedule({ notifications: wanted });
  } catch {
    /* ignore — reminders are best effort */
  }
}

/** Show (or clear) the ongoing "clocked in" notification with a Clock out button. */
async function syncWorkoutNotification(s: AppState) {
  if (!isNative) return;
  const active = s.sessions.find((x) => x.id === s.activeSessionId && !x.endedAt);
  try {
    if (!active) {
      await LocalNotifications.cancel({ notifications: [{ id: ID.workout }] });
      return;
    }
    if (!(await notificationsReady())) return;
    const at = new Date(active.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: ID.workout,
          title: t("{title} · clocked in", { title: active.title }),
          body: t("Started at {time}. Tap Clock out when you're done.", { time: at }),
          channelId: "workout",
          ongoing: true,
          autoCancel: false,
          actionTypeId: WORKOUT_TYPE,
          extra: { kind: "workout", sessionId: active.id },
        },
      ],
    });
  } catch {
    /* ignore */
  }
}

/** Let the phone (or watch) buzz when rest is over, even with the screen off. */
export async function scheduleRestEnd(endsAt: number | null) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ID.rest }] });
    if (endsAt && (await notificationsReady())) {
      await LocalNotifications.schedule({
        notifications: [{ id: ID.rest, title: t("Rest over"), body: t("Time for your next set."), channelId: "reminders", schedule: { at: new Date(endsAt), allowWhileIdle: true } }],
      });
    }
  } catch {
    /* ignore */
  }
}

/** Clock in from a reminder: start today's planned session, or a free workout. */
export function clockInFromReminder() {
  const s = getState();
  if (s.activeSessionId) return;
  const plan = buildPlan(s.profile, s.split);
  const day = plan.days.find((d) => d.weekday === weekdayOf(todayKey()));
  actions.clockIn(day ? day.title : "Workout", day ? sessionFromPlan(day) : []);
}

export function clockOutFromNotification() {
  const s = getState();
  const active = s.sessions.find((x) => x.id === s.activeSessionId);
  if (active) actions.clockOut(active.id, sessionKcal(active, s.profile.weightKg, Date.now()));
}

/** Wire notification buttons and keep notifications in step with the app's data. */
export function startNativeServices() {
  if (!isNative) return;
  LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
    if (e.actionId === "clock-in") clockInFromReminder();
    if (e.actionId === "clock-out") clockOutFromNotification();
  }).catch(() => {});

  let prev = getState();
  syncWorkoutNotification(prev);
  subscribe(() => {
    const s = getState();
    if (s.activeSessionId !== prev.activeSessionId || s.sessions !== prev.sessions) syncWorkoutNotification(s);
    if (s.reminders !== prev.reminders || s.profile !== prev.profile || s.split !== prev.split || s.language !== prev.language || s.periods !== prev.periods) syncReminders(s);
    prev = s;
  });
}

// ── Files & sharing ──────────────────────────────────────

/** Save a file and open the share sheet (phone) or download it (browser). */
export async function shareFile(name: string, data: Blob, title: string) {
  if (isNative) {
    const base64 = await blobToBase64(data);
    const { uri } = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
    await Share.share({ title, files: [uri], dialogTitle: title });
    return;
  }
  const file = new File([data], name, { type: data.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(b);
  });
}
