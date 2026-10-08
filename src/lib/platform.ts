import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Camera, MediaTypeSelection } from "@capacitor/camera";
import { Dialog } from "@capacitor/dialog";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Preferences } from "@capacitor/preferences";

/** True inside the iOS / Android app, false in a browser or installed PWA. */
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as "ios" | "android" | "web";

/**
 * Base URL of the API server. On the web the app and API share an origin, so it's empty.
 * Native apps load from capacitor://localhost (iOS) or https://localhost (Android),
 * so they need the deployed server's address baked in at build time via VITE_API_URL.
 */
const API_BASE = (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
export const apiUrl = (path: string) => `${API_BASE}${path}`;
export const apiConfigured = !isNative || API_BASE !== "";

// ── Haptics ─────────────────────────────────────────────
// Native Taptic Engine / vibration motor in the apps. The web Vibration API works on
// Android browsers only; iOS Safari ignores it.

export type HapticKind = "light" | "medium" | "success";

export function haptic(kind: HapticKind = "light") {
  if (isNative) {
    const p =
      kind === "success"
        ? Haptics.notification({ type: NotificationType.Success })
        : Haptics.impact({ style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
    p.catch(() => {});
    return;
  }
  try {
    navigator.vibrate?.(kind === "success" ? [12, 60, 12] : kind === "medium" ? 15 : 8);
  } catch {
    /* unsupported */
  }
}

// ── Dialogs ─────────────────────────────────────────────

export async function confirmDialog(title: string, message: string, okButtonTitle = "Delete"): Promise<boolean> {
  if (isNative) {
    const { value } = await Dialog.confirm({ title, message, okButtonTitle, cancelButtonTitle: "Cancel" });
    return value;
  }
  return window.confirm(`${title}\n\n${message}`);
}

// ── Photos ──────────────────────────────────────────────

/** Opens the native camera or photo picker and returns the image as a File, or null if cancelled. */
export async function pickNativePhoto(source: "camera" | "library"): Promise<File | null> {
  try {
    const result =
      source === "camera"
        ? await Camera.takePhoto({ quality: 85, targetWidth: 1600, targetHeight: 1600, correctOrientation: true })
        : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, limit: 1, quality: 85, targetWidth: 1600 })).results[0];
    if (!result?.webPath) return null;
    const blob = await (await fetch(result.webPath)).blob();
    return new File([blob], "meal.jpg", { type: blob.type || "image/jpeg" });
  } catch (e) {
    // The plugin rejects when the user backs out of the camera or picker.
    if (/cancel/i.test(String((e as Error)?.message ?? e))) return null;
    throw e;
  }
}

// ── Durable storage ─────────────────────────────────────
// iOS may evict WebView localStorage under storage pressure, so the native apps also keep
// a copy in Preferences (UserDefaults / SharedPreferences), which the OS never clears.

export async function readDurable(key: string): Promise<string | null> {
  if (!isNative) return null;
  return (await Preferences.get({ key })).value;
}

export function writeDurable(key: string, value: string) {
  if (isNative) Preferences.set({ key, value }).catch(() => {});
}

// ── Android back button ─────────────────────────────────
// Open sheets register here so the hardware/gesture back closes the top sheet first.

const backStack: (() => void)[] = [];

export function pushBackHandler(fn: () => void) {
  backStack.push(fn);
  return () => {
    const i = backStack.lastIndexOf(fn);
    if (i >= 0) backStack.splice(i, 1);
  };
}

export function onBackButton(fallback: () => boolean) {
  if (platform !== "android") return () => {};
  const handle = App.addListener("backButton", () => {
    const top = backStack[backStack.length - 1];
    if (top) return top();
    if (fallback()) return;
    App.minimizeApp();
  });
  return () => {
    handle.then((h) => h.remove());
  };
}
