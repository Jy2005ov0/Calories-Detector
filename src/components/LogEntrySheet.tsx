import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { mealLabel, mealOptions } from "../lib/api";
import { round } from "../lib/nutrition";
import { actions } from "../lib/store";
import type { LogEntry, MealType } from "../lib/types";
import { NumberInput, Segmented, Sheet, haptic, showToast } from "./ui";

/** Delete a logged food, with a few seconds to undo it. */
export function deleteLogEntry(e: LogEntry) {
  haptic("light");
  actions.removeLog(e.id);
  showToast(t("Removed {name}", { name: e.name }), { label: t("Undo"), run: () => actions.restoreLog(e) });
}

/** Fix a food you logged by mistake: change the amount, move it to another meal, or delete it. */
export function LogEntrySheet({ entry, onClose }: { entry: LogEntry | null; onClose: () => void }) {
  useLanguage();
  const [grams, setGrams] = useState(0);
  const [meal, setMeal] = useState<MealType>("breakfast");
  useEffect(() => {
    if (!entry) return;
    setGrams(Math.round(entry.grams));
    setMeal(entry.meal);
  }, [entry]);

  const valid = grams >= 1 && grams <= 5000;
  const kcal = entry && valid ? (entry.nutrients.kcal * grams) / entry.grams : 0;
  const changed = !!entry && (meal !== entry.meal || Math.abs(grams - entry.grams) >= 0.5);

  return (
    <Sheet open={!!entry} onClose={onClose} title={t("Edit food")}>
      {entry && (
        <>
          <h2 className="h2" style={{ marginTop: 4 }}>
            {entry.name}
          </h2>
          {entry.note && <p className="footnote" style={{ marginTop: 0 }}>{entry.note}</p>}
          <div className="card" style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="big-number" data-testid="edit-kcal">
              {round(kcal)}
            </span>
            <span className="muted">kcal</span>
          </div>
          <div className="group" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="edit-grams">{t("Amount")}</label>
              <NumberInput id="edit-grams" value={grams} onChange={setGrams} min={0} max={5000} />
              <span className="muted" style={{ width: 28 }}>
                g
              </span>
            </div>
          </div>
          <div className="section-header">{t("Meal")}</div>
          <Segmented value={meal} onChange={setMeal} options={mealOptions()} ariaLabel={t("Meal")} />
          <div className="spacer" />
          <button
            className="btn"
            disabled={!valid || !changed}
            onClick={() => {
              actions.updateLog(entry.id, { grams, meal });
              haptic("success");
              showToast(meal !== entry.meal ? t("Moved to {meal}", { meal: mealLabel(meal) }) : t("Updated {name}", { name: entry.name }));
              onClose();
            }}
          >
            {t("Save changes")}
          </button>
          <button
            className="btn secondary"
            style={{ marginTop: 10, color: "var(--red)" }}
            onClick={() => {
              deleteLogEntry(entry);
              onClose();
            }}
          >
            <Trash2 size={17} /> {t("Delete from {meal}", { meal: mealLabel(entry.meal) })}
          </button>
        </>
      )}
    </Sheet>
  );
}
