import { useEffect, useState } from "react";
import { BatteryCharging, Footprints, Moon, Pill, Plus, Smile, Trash2 } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { round } from "../lib/nutrition";
import { DEFAULT_STEP_GOAL, enableSteps, stepKcal, stepsSupported } from "../lib/steps";
import { actions, uid, useStore } from "../lib/store";
import type { Supplement } from "../lib/types";
import { Bar, Sheet, Stepper, Switch, haptic, showToast } from "./ui";

/**
 * Steps today, as a compact row inside the calorie summary card (or a prompt to turn the step
 * counter on). Nothing shows where the phone can't count steps.
 */
export function StepsRow({ today }: { today: string }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const steps = useStore((s) => s.days.find((d) => d.id === today)?.steps ?? 0);
  if (!stepsSupported()) return null;
  const goal = profile.stepGoal || DEFAULT_STEP_GOAL;
  return (
    <div className="steps-row" data-testid="steps-card">
      <div className="hairline" />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="icon-tile small" style={{ background: "var(--teal)" }}>
          <Footprints size={15} />
        </div>
        {profile.stepsOn ? (
          <div className="row-main">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <span className="tile-title tabular">{t("{n} steps", { n: steps.toLocaleString() })}</span>
              <span className="tile-sub tabular" style={{ flex: "none" }}>
                {t("Goal {goal}", { goal: goal.toLocaleString() })}
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Bar value={steps} max={goal} color="var(--teal)" />
            </div>
            <div className="tile-sub" style={{ marginTop: 4 }}>
              {t("About {kcal} kcal walking", { kcal: round(stepKcal(steps, profile.weightKg)) })}
            </div>
          </div>
        ) : (
          <>
            <div className="row-main">
              <div className="tile-title">{t("Count your steps")}</div>
              <div className="tile-sub">{t("Uses your phone's motion sensor")}</div>
            </div>
            <button
              className="btn small tinted"
              onClick={async () => {
                if (await enableSteps()) {
                  actions.updateProfile({ stepsOn: true });
                  haptic("success");
                } else showToast(t("Steps aren't available: allow motion & fitness access in your phone's settings."));
              }}
            >
              {t("Turn on")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// A selector must return the same value each time it's read, or React re-renders forever.
const NONE: string[] = [];

const FACES = ["😫", "🙁", "😐", "🙂", "😄"];
const BOLTS = ["1", "2", "3", "4", "5"];

/** Morning check-in: hours slept, mood and energy, in three taps. */
export function CheckInCard({ today }: { today: string }) {
  useLanguage();
  const day = useStore((s) => s.days.find((d) => d.id === today));
  const [editing, setEditing] = useState(false);
  const [sleepH, setSleep] = useState(7);
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(0);
  const done = day?.sleepH !== undefined;
  useEffect(() => {
    if (!editing) return;
    setSleep(day?.sleepH ?? 7);
    setMood(day?.mood ?? 0);
    setEnergy(day?.energy ?? 0);
  }, [editing, day]);
  if (done && !editing) {
    return (
      <button className="card pressable checkin-done" style={{ marginTop: 12 }} onClick={() => setEditing(true)} data-testid="checkin">
        <Moon size={16} color="var(--indigo)" />
        <span className="row-main" style={{ textAlign: "left" }}>
          {t("Slept {h} h", { h: day!.sleepH! })}
          {day!.mood ? ` · ${FACES[day!.mood - 1]}` : ""}
          {day!.energy ? ` · ${t("energy {n}/5", { n: day!.energy })}` : ""}
        </span>
        <span className="link" style={{ fontSize: 15 }}>
          {t("Edit")}
        </span>
      </button>
    );
  }
  return (
    <div className="card" style={{ marginTop: 12 }} data-testid="checkin">
      <div className="tile-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Moon size={17} color="var(--indigo)" /> {t("Morning check-in")}
      </div>
      <div className="checkin-row">
        <span>{t("Sleep")}</span>
        <Stepper value={sleepH} onChange={setSleep} step={0.5} min={0} max={14} format={(v) => `${v} h`} label={t("sleep")} />
      </div>
      <div className="checkin-row">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Smile size={15} /> {t("Mood")}
        </span>
        <div className="choice-row" role="radiogroup" aria-label={t("Mood")}>
          {FACES.map((f, i) => (
            <button key={f} role="radio" aria-checked={mood === i + 1} aria-label={t("Mood {n} of 5", { n: i + 1 })} className={mood === i + 1 ? "active" : ""} onClick={() => setMood(i + 1)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="checkin-row">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BatteryCharging size={15} /> {t("Energy")}
        </span>
        <div className="choice-row" role="radiogroup" aria-label={t("Energy")}>
          {BOLTS.map((b, i) => (
            <button key={b} role="radio" aria-checked={energy === i + 1} aria-label={t("Energy {n} of 5", { n: i + 1 })} className={energy === i + 1 ? "active" : ""} onClick={() => setEnergy(i + 1)}>
              {b}
            </button>
          ))}
        </div>
      </div>
      <button
        className="btn small"
        style={{ marginTop: 12 }}
        onClick={() => {
          actions.setCheckIn(today, { sleepH, mood: mood || undefined, energy: energy || undefined });
          setEditing(false);
          haptic("success");
        }}
      >
        {t("Save check-in")}
      </button>
    </div>
  );
}

/** Today's supplement and medicine doses, ticked off as they're taken. */
export function SupplementsCard({ today }: { today: string }) {
  useLanguage();
  const list = useStore((s) => s.supplements);
  const taken = useStore((s) => s.days.find((d) => d.id === today)?.taken) ?? NONE;
  const [manage, setManage] = useState(false);
  if (!list.length) return null;
  const doses = list.flatMap((x) => x.times.map((time) => ({ x, time, key: `${x.id}@${time}` }))).sort((a, b) => a.time.localeCompare(b.time));
  const done = doses.filter((d) => taken.includes(d.key)).length;
  return (
    <>
      <div className="section-header">
        <span>
          {t("Supplements & medicine")} · {done}/{doses.length}
        </span>
        <button onClick={() => setManage(true)}>{t("Edit")}</button>
      </div>
      <div className="group" data-testid="supplements-today">
        {doses.map((d) => {
          const on = taken.includes(d.key);
          return (
            <button key={d.key} className="row with-icon" role="checkbox" aria-checked={on} onClick={() => actions.toggleTaken(today, d.key)}>
              <span className={`tick ${on ? "on" : ""}`} aria-hidden>
                {on ? "✓" : ""}
              </span>
              <div className="row-main">
                <div className="row-title" style={{ textDecoration: on ? "line-through" : undefined, opacity: on ? 0.6 : 1 }}>
                  {d.x.name}
                </div>
                <div className="row-sub">
                  {d.time}
                  {d.x.dose ? ` · ${d.x.dose}` : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <SupplementsSheet open={manage} onClose={() => setManage(false)} />
    </>
  );
}

/** Add, change or remove supplements and medicines, with reminder times. */
export function SupplementsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const list = useStore((s) => s.supplements);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("08:00");
  useEffect(() => {
    if (open) {
      setName("");
      setDose("");
      setTime("08:00");
    }
  }, [open]);
  const add = () => {
    const existing = list.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    const item: Supplement = existing
      ? { ...existing, times: [...new Set([...existing.times, time])].sort(), dose: dose.trim() || existing.dose }
      : { id: uid(), name: name.trim(), dose: dose.trim() || undefined, times: [time], remind: true, createdAt: Date.now() };
    actions.saveSupplement(item);
    setName("");
    setDose("");
    haptic("success");
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("Supplements & medicine")}>
      <p className="footnote" style={{ marginTop: 0 }}>
        {t("Add what you take each day. W reminds you at each time and you tick it off on Today.")}
      </p>
      <div className="group">
        <div className="field">
          <label htmlFor="sup-name">{t("Name")}</label>
          <input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Vitamin D, creatine")} maxLength={40} />
        </div>
        <div className="field">
          <label htmlFor="sup-dose">{t("Dose")}</label>
          <input id="sup-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder={t("Optional, e.g. 1 tablet")} maxLength={40} />
        </div>
        <div className="field">
          <label htmlFor="sup-time">{t("Time")}</label>
          <input id="sup-time" type="time" value={time} onChange={(e) => setTime(e.target.value || "08:00")} />
        </div>
      </div>
      <div className="spacer" />
      <button className="btn tinted" disabled={!name.trim()} onClick={add}>
        <Plus size={18} /> {t("Add")}
      </button>
      {list.length > 0 && (
        <>
          <div className="section-header">{t("Your list")}</div>
          <div className="group">
            {list.map((x) => (
              <div className="row with-icon" key={x.id}>
                <div className="icon-tile" style={{ background: "var(--green)" }}>
                  <Pill size={16} />
                </div>
                <div className="row-main">
                  <div className="row-title">{x.name}</div>
                  <div className="row-sub">
                    {x.times.join(", ")}
                    {x.dose ? ` · ${x.dose}` : ""}
                  </div>
                </div>
                <Switch checked={x.remind} onChange={(v) => actions.saveSupplement({ ...x, remind: v })} label={t("Remind me about {name}", { name: x.name })} />
                <button
                  className="icon-btn"
                  aria-label={t("Delete {name}", { name: x.name })}
                  onClick={() => {
                    actions.deleteSupplement(x.id);
                    showToast(t("Deleted {name}", { name: x.name }), { label: t("Undo"), run: () => actions.saveSupplement({ ...x, id: uid() }) });
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
