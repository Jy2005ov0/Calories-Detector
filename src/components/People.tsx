import { useRef, useState } from "react";
import { Camera, Check, Trash2, UserPlus } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { avatarFromFile, confirmDialog, isNative, pickNativePhoto } from "../lib/platform";
import { actions, getState, useStore, type AppState } from "../lib/store";
import { Sheet, showToast } from "./ui";

// Several people (a family) can use one phone, each with their own profile,
// food log, workouts, weight and cycle. One of them is "using the app" at a time.

const COLORS = ["var(--blue)", "var(--pink)", "var(--green)", "var(--orange)", "var(--purple)", "var(--teal)"];
const colorFor = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const nameOf = (name: string) => name.trim() || t("No name");

export function PersonAvatar({ id, name, photo, size = 34 }: { id: string; name: string; photo?: string; size?: number }) {
  if (photo) return <img className="avatar" src={photo} alt="" aria-hidden width={size} height={size} style={{ width: size, height: size, objectFit: "cover" }} />;
  return (
    <div className="avatar" aria-hidden style={{ width: size, height: size, fontSize: size * 0.42, background: colorFor(id) }}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </div>
  );
}

/** Choose a profile picture from the photo library (or files on a computer), or remove it. */
export function PhotoPicker({ id, name, photo, onChange }: { id: string; name: string; photo?: string; onChange: (photo: string | undefined) => void }) {
  useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const use = async (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await avatarFromFile(file));
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const choose = async () => {
    if (!isNative) return input.current?.click();
    try {
      await use(await pickNativePhoto("library"));
    } catch {
      showToast(t("Couldn't open your photos. Allow W to access Photos in Settings."));
    }
  };
  return (
    <div className="photo-picker">
      <button className="pressable photo-picker-avatar" onClick={choose} aria-label={photo ? t("Change profile photo") : t("Add a profile photo")} disabled={busy}>
        <PersonAvatar id={id} name={name} photo={photo} size={72} />
        <span className="photo-picker-badge" aria-hidden>
          {busy ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <Camera size={13} />}
        </span>
      </button>
      {/* Side by side, far enough apart that their 44 pt tap areas don't overlap. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 24, rowGap: 24 }}>
        <button className="link bold tap" onClick={choose} disabled={busy}>
          {photo ? t("Change photo") : t("Add a photo")}
        </button>
        {photo && (
          <button className="link tap" style={{ color: "var(--red)" }} onClick={() => onChange(undefined)}>
            {t("Remove photo")}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={t("Profile photo")}
        onChange={(e) => {
          void use(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function switchTo(id: string, name: string) {
  if (getState().activeSessionId) {
    showToast(t("Clock out of the current workout first"));
    return false;
  }
  actions.switchPerson(id);
  showToast(t("Now using W as {name}", { name: nameOf(name) }));
  return true;
}

/** Everyone in the household, the current person first. */
export function PeopleList({ onSwitched }: { onSwitched?: () => void }) {
  useLanguage();
  const me = useStore((s) => s.profile);
  const myId = useStore((s) => s.personId);
  const people = useStore((s) => s.people);
  const others = people.filter((p) => p.data.profile.onboarded);
  return (
    <div className="group" role="group" aria-label={t("People")}>
      <div className="row with-icon">
        <PersonAvatar id={myId} name={me.name} photo={me.photo} />
        <div className="row-main">
          <div className="row-title">{nameOf(me.name)}</div>
          <div className="row-sub">{t("Using the app now")}</div>
        </div>
        <Check size={18} color="var(--blue)" aria-label={t("Current person")} />
      </div>
      {others.map((p) => (
        <div className="row with-icon" key={p.id}>
          <button
            className="row-main"
            style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "none", border: 0, padding: 0, color: "inherit", font: "inherit" }}
            onClick={() => switchTo(p.id, p.data.profile.name) && onSwitched?.()}
            aria-label={t("Switch to {name}", { name: nameOf(p.data.profile.name) })}
          >
            <PersonAvatar id={p.id} name={p.data.profile.name} photo={p.data.profile.photo} />
            <span className="row-title">{nameOf(p.data.profile.name)}</span>
          </button>
          <button
            className="icon-btn"
            aria-label={t("Remove {name}", { name: nameOf(p.data.profile.name) })}
            onClick={async () => {
              const name = nameOf(p.data.profile.name);
              if (await confirmDialog(t("Remove {name}?", { name }), t("{name}'s profile, food log, workouts and weight will be deleted from this phone.", { name }), t("Remove"))) {
                actions.removePerson(p.id);
                showToast(t("Removed {name}", { name }));
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        className="row with-icon"
        onClick={() => {
          if (getState().activeSessionId) return void showToast(t("Clock out of the current workout first"));
          actions.addPerson();
        }}
      >
        <div className="icon-tile" style={{ background: "var(--blue)" }}>
          <UserPlus size={17} />
        </div>
        <div className="row-main">
          <div className="row-title" style={{ color: "var(--blue)" }}>
            {t("Add a person")}
          </div>
          <div className="row-sub">{t("Family members get their own plan and log")}</div>
        </div>
      </button>
    </div>
  );
}

/** Quick switcher from the Today screen. */
export function PeopleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  return (
    <Sheet open={open} onClose={onClose} title={t("Who's using W?")}>
      <PeopleList onSwitched={onClose} />
    </Sheet>
  );
}

export const householdSize = (s: AppState) => 1 + s.people.filter((p) => p.data.profile.onboarded).length;
