import { useState } from "react";
import { Pencil, TriangleAlert } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { MAX_KCAL, MIN_KCAL, safeMinimum, suggestedKcal, targets } from "../lib/nutrition";
import { actions, useStore } from "../lib/store";
import { NumberInput, Segmented, Sheet, haptic } from "./ui";

/**
 * Daily calorie target: worked out automatically from the profile and goal, or a number the
 * person chooses (slider or typed). The suggestion stays in view, with a warning below a safe minimum.
 */
export function CalorieTargetEditor() {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const suggested = suggestedKcal(profile);
  const own = profile.kcalTarget !== undefined;
  const value = profile.kcalTarget ?? suggested;
  const tg = targets(profile);
  const low = own && value < safeMinimum(profile);
  const set = (v: number) => actions.updateProfile({ kcalTarget: Math.round(Math.min(MAX_KCAL, Math.max(MIN_KCAL, v)) / 10) * 10 });
  return (
    <div className="card kcal-target" data-testid="kcal-target">
      <Segmented
        ariaLabel={t("Daily calorie target")}
        value={own ? "own" : "auto"}
        onChange={(v) => {
          haptic("light");
          actions.updateProfile({ kcalTarget: v === "own" ? suggested : undefined });
        }}
        options={[
          { value: "auto", label: t("Automatic") },
          { value: "own", label: t("My own") },
        ]}
      />
      <div className="kcal-target-value">
        {own ? (
          <label className="kcal-input">
            <span className="sr-only">{t("Calories a day")}</span>
            <NumberInput integer min={MIN_KCAL} max={MAX_KCAL} value={value} onChange={(v) => v >= MIN_KCAL && set(v)} inputMode="numeric" />
          </label>
        ) : (
          <span className="big-number tabular">{value.toLocaleString()}</span>
        )}
        <span className="muted">{t("kcal / day")}</span>
      </div>
      {own ? (
        <>
          <input
            type="range"
            className="kcal-slider"
            min={1000}
            max={4500}
            step={10}
            value={Math.min(4500, Math.max(1000, value))}
            onChange={(e) => set(Number(e.target.value))}
            aria-label={t("Calories a day")}
            aria-valuetext={t("{n} kcal a day", { n: value.toLocaleString() })}
            style={{ "--pos": `${((Math.min(4500, Math.max(1000, value)) - 1000) / 3500) * 100}%` } as React.CSSProperties}
          />
          <div className="kcal-suggested">
            <span>{t("Suggested for your goal: {n} kcal", { n: suggested.toLocaleString() })}</span>
            {value !== suggested && (
              <button className="link tap" onClick={() => set(suggested)}>
                {t("Use it")}
              </button>
            )}
          </div>
          {low && (
            <p className="kcal-warning" role="alert">
              <TriangleAlert size={15} /> {t("Below {n} kcal a day is hard to get enough nutrients from. Only go this low with a doctor's advice.", { n: safeMinimum(profile).toLocaleString() })}
            </p>
          )}
        </>
      ) : (
        <p className="footnote" style={{ margin: "4px 0 0" }}>
          {t("Worked out from your body, activity and goal. It updates when they change.")}
        </p>
      )}
      <p className="footnote" style={{ margin: "6px 0 0" }}>
        {t("Protein {p} g · carbs {c} g · fat {f} g a day follow this target.", { p: tg.protein, c: tg.carbs, f: tg.fat })}
      </p>
    </div>
  );
}

/** The same editor in a sheet, opened from Today's "Daily target". */
export function CalorieTargetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  return (
    <Sheet open={open} onClose={onClose} title={t("Daily calorie target")}>
      <CalorieTargetEditor />
    </Sheet>
  );
}

/** Today's "Daily target" figure: tap it to change the target. */
export function DailyTargetButton({ kcal }: { kcal: number }) {
  useLanguage();
  const own = useStore((s) => s.profile.kcalTarget !== undefined);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="stat stat-button" onClick={() => setOpen(true)} aria-label={t("Daily target {n} kcal, change", { n: kcal })}>
        <span className="stat-label">
          {own ? t("My target") : t("Daily target")} <Pencil size={11} aria-hidden />
        </span>
        <span className="stat-value">
          {kcal}
          <small>kcal</small>
        </span>
      </button>
      <CalorieTargetSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
