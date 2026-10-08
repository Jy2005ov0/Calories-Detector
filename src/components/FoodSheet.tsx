import { useEffect, useMemo, useState } from "react";
import { MEALS, defaultMeal } from "../lib/api";
import { healthReport, isWholeProduce, round, scale, suitability, sum, targets } from "../lib/nutrition";
import { actions, todayKey, useStore } from "../lib/store";
import type { Food, MealType } from "../lib/types";
import { HealthCard, NutritionTable, Segmented, Sheet, Stepper, SuitabilityCard, haptic, showToast } from "./ui";

export function useTodayTotals() {
  const log = useStore((s) => s.log);
  return useMemo(() => {
    const today = todayKey();
    return sum(log.filter((e) => e.date === today).map((e) => e.nutrients));
  }, [log]);
}

interface Props {
  food: Food | null;
  onClose: () => void;
  /** When set, the sheet returns the chosen portion instead of logging it. */
  onPick?: (food: Food, grams: number) => void;
  pickLabel?: string;
}

export function FoodSheet({ food, onClose, onPick, pickLabel = "Add to meal" }: Props) {
  const profile = useStore((s) => s.profile);
  const eaten = useTodayTotals();
  const [servingIdx, setServingIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState<MealType>(defaultMeal());

  useEffect(() => {
    if (food) {
      setServingIdx(0);
      setQty(1);
      setMeal(defaultMeal());
    }
  }, [food]);

  const servings = useMemo(() => {
    if (!food) return [];
    const list = [...food.servings];
    if (!list.some((s) => s.grams === 100)) list.push({ label: "100 g", grams: 100 });
    list.push({ label: "1 g", grams: 1 });
    return list;
  }, [food]);

  const serving = servings[servingIdx] ?? { label: "100 g", grams: 100 };
  const grams = round(serving.grams * qty, 1);
  const n = food ? scale(food.per100, grams) : null;
  const t = targets(profile);
  const isGramMode = serving.grams === 1;

  const add = () => {
    if (!food || !n || grams <= 0) return;
    if (onPick) {
      onPick(food, grams);
      onClose();
      return;
    }
    actions.addLog([{ date: todayKey(), meal, name: food.name, grams, nutrients: n, source: food.source }]);
    actions.touchRecent(food.id);
    haptic();
    showToast(`Added ${food.name.length > 22 ? food.name.slice(0, 22) + "…" : food.name} · ${round(n.kcal)} kcal`);
    onClose();
  };

  return (
    <Sheet open={!!food} onClose={onClose} title={food?.brand ?? food?.category}>
      {food && n && (
        <>
          <h2 className="h2" style={{ marginTop: 4 }}>
            {food.name}
          </h2>

          <div className="card">
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="big-number">{round(n.kcal)}</span>
              <span className="muted">kcal · {grams} g</span>
            </div>
            <div className="spacer" />
            <div className="macro-row">
              {[
                ["Protein", n.protein, "var(--protein)"],
                ["Carbs", n.carbs, "var(--carbs)"],
                ["Fat", n.fat, "var(--fat)"],
              ].map(([k, v, c]) => (
                <div className="stat" key={k as string}>
                  <span className="stat-label">
                    <span className="dot" style={{ background: c as string }} />
                    {k}
                  </span>
                  <span className="stat-value" style={{ fontSize: "1.0625rem" }}>
                    {round(v as number, 1)}
                    <small>g</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-header">Portion</div>
          <div className="chips" style={{ paddingInline: 16 }}>
            {servings.map((s, i) => (
              <button
                key={s.label + i}
                className={`chip ${i === servingIdx ? "active" : ""}`}
                onClick={() => {
                  setServingIdx(i);
                  setQty(s.grams === 1 ? Math.round(serving.grams * qty) || 100 : 1);
                }}
              >
                {s.grams === 1 ? "Grams" : s.label === "100 g" ? "100 g" : `${s.label} (${s.grams} g)`}
              </button>
            ))}
          </div>
          <div className="group" style={{ marginTop: 10 }}>
            <div className="row">
              <div className="row-main">{isGramMode ? "Weight (g)" : "Quantity"}</div>
              {isGramMode ? (
                <input
                  className="num-input"
                  style={{ width: 90 }}
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0))}
                  aria-label="Weight in grams"
                />
              ) : (
                <Stepper value={qty} step={0.5} min={0.5} onChange={setQty} format={(v) => (v % 1 ? v.toFixed(1) : String(v))} />
              )}
            </div>
          </div>

          {!onPick && (
            <>
              <div className="section-header">Meal</div>
              <Segmented value={meal} options={MEALS} onChange={setMeal} />
            </>
          )}

          <div className="section-header">Is it good for me?</div>
          <SuitabilityCard s={suitability(n, t, eaten, profile.goal, isWholeProduce(food))} />
          <div className="spacer" />
          <HealthCard report={healthReport(n, { intrinsicSugar: isWholeProduce(food) })} />

          <div className="section-header">Nutrition for this portion</div>
          <NutritionTable n={n} />

          <div style={{ position: "sticky", bottom: 0, paddingTop: 16, background: "linear-gradient(transparent, var(--bg) 30%)" }}>
            <button className="btn" onClick={add} disabled={grams <= 0}>
              {onPick ? pickLabel : `Add to ${MEALS.find((m) => m.value === meal)!.label}`}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
