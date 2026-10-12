import { useState } from "react";
import { Baby, ChevronRight, Footprints, Pill, Type } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { PREGNANCY_EXTRA, targets } from "../lib/nutrition";
import { DEFAULT_STEP_GOAL, enableSteps, stepsSupported } from "../lib/steps";
import { actions, useStore } from "../lib/store";
import type { Profile } from "../lib/types";
import { SupplementsSheet } from "./Daily";
import { Segmented, Stepper, Switch, showToast } from "./ui";

/** Count steps, the daily goal, and whether walking adds to the calorie budget. */
export function StepsSettings() {
  useLanguage();
  const p = useStore((s) => s.profile);
  if (!stepsSupported()) return null;
  return (
    <>
      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Footprints size={14} /> {t("Steps")}
        </span>
      </div>
      <div className="group">
        <div className="field">
          <label>{t("Count my steps")}</label>
          <Switch
            checked={!!p.stepsOn}
            onChange={async (on) => {
              if (on && !(await enableSteps())) return showToast(t("Steps aren't available: allow motion & fitness access in your phone's settings."));
              actions.updateProfile({ stepsOn: on });
            }}
            label={t("Count my steps")}
          />
        </div>
        {p.stepsOn && (
          <>
            <div className="field">
              <label>{t("Daily goal")}</label>
              <Stepper value={p.stepGoal || DEFAULT_STEP_GOAL} min={2000} max={30000} step={1000} onChange={(stepGoal) => actions.updateProfile({ stepGoal })} format={(v) => v.toLocaleString()} label={t("step goal")} />
            </div>
            <div className="field">
              <label>{t("Add walking to my budget")}</label>
              <Switch checked={!!p.stepsInBudget} onChange={(stepsInBudget) => actions.updateProfile({ stepsInBudget })} label={t("Add walking to my budget")} />
            </div>
          </>
        )}
      </div>
      <p className="footnote">{t("Counted by your phone's motion sensor. Leave “Add walking to my budget” off if your activity level already counts a lot of walking, or you log walks as workouts.")}</p>
    </>
  );
}

const PREG_OPTIONS: { value: NonNullable<Profile["pregnancy"]>; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "t1", label: "Pregnant · 1st trimester" },
  { value: "t2", label: "Pregnant · 2nd trimester" },
  { value: "t3", label: "Pregnant · 3rd trimester" },
  { value: "breastfeeding", label: "Breastfeeding" },
];

/** Pregnancy and breastfeeding: higher targets, no weight-loss deficit. */
export function PregnancySection() {
  useLanguage();
  const p = useStore((s) => s.profile);
  if (p.sex !== "female") return null;
  const mode = p.pregnancy ?? "off";
  return (
    <>
      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Baby size={14} /> {t("Pregnancy & breastfeeding")}
        </span>
      </div>
      <div className="group" role="radiogroup" aria-label={t("Pregnancy & breastfeeding")}>
        {PREG_OPTIONS.map((o) => (
          <button
            key={o.value}
            className="row"
            role="radio"
            aria-checked={mode === o.value}
            onClick={() => {
              actions.updateProfile({ pregnancy: o.value });
              // Cycle predictions don't apply while pregnant.
              if (o.value.startsWith("t") && p.cycle.on) actions.updateProfile({ cycle: { ...p.cycle, on: false } });
            }}
          >
            <span className="row-main row-title">{t(o.label)}</span>
            {mode === o.value && <span className="check-mark" aria-hidden>✓</span>}
          </button>
        ))}
      </div>
      <p className="footnote">
        {mode === "off"
          ? t("Turn this on to raise your calorie and protein targets and pause any weight-loss deficit.")
          : t("Your target is maintenance plus {kcal} kcal, with {protein} g protein. No weight-loss deficit. Check your plan with your doctor or midwife.", {
              kcal: PREGNANCY_EXTRA[mode],
              protein: targets(p).protein,
            })}
      </p>
    </>
  );
}

/** Bigger text for easier reading; shared by everyone on the phone. */
export function TextSizeSection() {
  useLanguage();
  const size = useStore((s) => s.textSize);
  return (
    <>
      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Type size={14} /> {t("Text size")}
        </span>
      </div>
      <Segmented
        ariaLabel={t("Text size")}
        value={size}
        onChange={actions.setTextSize}
        options={[
          { value: "normal", label: t("Normal") },
          { value: "large", label: t("Large") },
          { value: "xlarge", label: t("Extra large") },
        ]}
      />
    </>
  );
}

/** A row in Profile that opens the supplements list. */
export function SupplementsRow() {
  useLanguage();
  const n = useStore((s) => s.supplements.length);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="row with-icon" onClick={() => setOpen(true)}>
        <div className="icon-tile" style={{ background: "var(--green)" }}>
          <Pill size={17} />
        </div>
        <div className="row-main">
          <div className="row-title">{t("Supplements & medicine")}</div>
          <div className="row-sub">{n ? t("{n} on your list, with reminders", { n }) : t("Daily reminders and a tick-off list")}</div>
        </div>
        <ChevronRight size={16} className="chev" />
      </button>
      <SupplementsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
