import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import type { RecipePart } from "../data/dishes";
import { recipeTotals } from "../data/foods";
import { FoodPicker } from "./MealBuilder";
import { t, useLanguage } from "../i18n";
import { foodConflicts, withConflicts } from "../lib/allergens";
import { defaultMeal, mealLabel, mealOptions } from "../lib/api";
import {
  healthReport,
  isWholeProduce,
  round,
  scale,
  suitability,
  sum,
  targets,
} from "../lib/nutrition";
import { actions, todayKey, useStore, useTodayKey } from "../lib/store";
import type { Food, MealType } from "../lib/types";
import {
  HealthCard,
  NutritionTable,
  Segmented,
  Sheet,
  Stepper,
  SuitabilityCard,
  AvoidCard,
  haptic,
  showToast,
} from "./ui";

interface Part extends RecipePart {
  extra?: boolean;
  /** Nutrition for extras, which may be custom or online foods. */
  per100?: Food["per100"];
}

const NO_PLURAL = new Set(["tbsp", "tsp", "g"]);
const IRREGULAR: Record<string, string> = {
  patty: "patties",
  leaf: "leaves",
  half: "halves",
};
const amount = (p: Part, q = p.qty) => {
  if (q === 0) return t("None");
  const n = q === 0.5 ? "½" : q % 1 ? q.toFixed(1) : String(q);
  if (p.extra) return `${n} × ${p.unit}`;
  const unit =
    q > 1 && !NO_PLURAL.has(p.unit)
      ? (IRREGULAR[p.unit] ?? `${p.unit}s`)
      : p.unit;
  return `${n} ${unit}`;
};

/** "2 × Fried egg · no Peanuts · + Beef rendang" — what differs from the standard recipe. */
function describeChanges(recipe: RecipePart[], parts: Part[]) {
  const out: string[] = [];
  for (const p of parts) {
    const base = recipe.find(
      (r) => r.food === p.food && r.label === p.label && !p.extra,
    );
    if (!base) {
      if (p.qty > 0) out.push(`+ ${p.label}`);
    } else if (p.qty !== base.qty)
      out.push(
        p.qty === 0 ? t("no {item}", { item: p.label }) : `${p.label}: ${amount(p)}`,
      );
  }
  return out.join(" · ");
}

export function useTodayTotals() {
  const log = useStore((s) => s.log);
  const today = useTodayKey();
  return useMemo(() => {
    return sum(log.filter((e) => e.date === today).map((e) => e.nutrients));
  }, [log, today]);
}

interface Props {
  food: Food | null;
  onClose: () => void;
  /** When set, the sheet returns the chosen portion instead of logging it. */
  onPick?: (food: Food, grams: number) => void;
  pickLabel?: string;
}

export function FoodSheet({
  food,
  onClose,
  onPick,
  pickLabel,
}: Props) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const eaten = useTodayTotals();
  const [servingIdx, setServingIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState<MealType>(defaultMeal());
  const [parts, setParts] = useState<Part[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (food) {
      setServingIdx(0);
      setQty(1);
      setMeal(defaultMeal());
      setParts(food.recipe?.map((p) => ({ ...p })) ?? []);
    }
  }, [food]);

  const isDish = !!food?.recipe;
  const dish = useMemo(
    () =>
      isDish
        ? recipeTotals(
            parts.map((p) => ({ food: p.food, grams: p.unitGrams * p.qty, per100: p.per100 })),
          )
        : null,
    [isDish, parts],
  );
  const changes = food?.recipe ? describeChanges(food.recipe, parts) : "";

  const servings = useMemo(() => {
    if (!food) return [];
    const list = [...food.servings];
    if (!list.some((s) => s.grams === 100))
      list.push({ label: "100 g", grams: 100 });
    list.push({ label: "1 g", grams: 1 });
    return list;
  }, [food]);

  const serving = servings[servingIdx] ?? { label: "100 g", grams: 100 };
  const grams = dish
    ? round(dish.grams * qty, 1)
    : round(serving.grams * qty, 1);
  const n = !food
    ? null
    : dish
      ? scale(
          dish.grams > 0
            ? (Object.fromEntries(
                Object.entries(dish.total).map(([k, v]) => [
                  k,
                  (v / dish.grams) * 100,
                ]),
              ) as unknown as Food["per100"])
            : food.per100,
          grams,
        )
      : scale(food.per100, grams);
  const tg = targets(profile);
  const isGramMode = serving.grams === 1;

  const add = () => {
    if (!food || !n || grams <= 0) return;
    if (onPick) {
      onPick(food, grams);
      onClose();
      return;
    }
    actions.addLog([
      {
        date: todayKey(),
        meal,
        name: changes ? t("{name} (customised)", { name: food.name }) : food.name,
        grams,
        nutrients: n,
        source: food.source,
        ...(changes ? { note: changes } : {}),
      },
    ]);
    actions.touchRecent(food.id);
    haptic();
    showToast(
      t("Added {name} · {kcal} kcal", { name: food.name.length > 22 ? food.name.slice(0, 22) + "…" : food.name, kcal: round(n.kcal) }),
    );
    onClose();
  };

  return (
    <>
      <Sheet
        open={!!food}
        onClose={onClose}
        title={food?.brand ?? (food?.category ? t(food.category) : undefined)}
      >
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
                      <span
                        className="dot"
                        style={{ background: c as string }}
                      />
                      {t(k as string)}
                    </span>
                    <span
                      className="stat-value"
                      style={{ fontSize: "1.0625rem" }}
                    >
                      {round(v as number, 1)}
                      <small>g</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isDish ? (
              <>
                <div className="section-header">
                  <span>{t("What's in it")}</span>
                  {changes && (
                    <button
                      onClick={() =>
                        setParts(food.recipe!.map((p) => ({ ...p })))
                      }
                    >
                      <RotateCcw size={13} style={{ marginRight: 4 }} /> {t("Reset")}
                    </button>
                  )}
                </div>
                <div className="group" data-testid="dish-parts">
                  {parts.map((p, i) => {
                    const kcal = recipeTotals([
                      { food: p.food, grams: p.unitGrams * p.qty, per100: p.per100 },
                    ]).total.kcal;
                    return (
                      <div
                        className="row"
                        key={`${p.food}-${i}`}
                        style={{ opacity: p.qty === 0 ? 0.55 : 1 }}
                      >
                        <div className="row-main">
                          <div className="row-title">{p.label}</div>
                          <div className="row-sub">
                            {p.qty === 0
                              ? t("Not included")
                              : `${Math.round(p.unitGrams * p.qty)} g · ${round(kcal)} kcal`}
                          </div>
                        </div>
                        <Stepper
                          value={p.qty}
                          step={p.step ?? 1}
                          min={0}
                          max={20}
                          label={p.label}
                          format={() => amount(p)}
                          onChange={(v) =>
                            setParts((list) =>
                              list.map((x, j) =>
                                j === i ? { ...x, qty: v } : x,
                              ),
                            )
                          }
                        />
                      </div>
                    );
                  })}
                  <button
                    className="row"
                    onClick={() => setPicking(true)}
                    style={{ color: "var(--blue)" }}
                  >
                    <Plus size={18} /> {t("Add an ingredient")}
                  </button>
                </div>
                <p className="footnote">
                  {t("Set how much of each part is on your plate.")}{" "}
                  {changes ? t("Changed: {changes}.", { changes }) : ""}
                </p>
                <div className="group" style={{ marginTop: 12 }}>
                  <div className="row">
                    <div className="row-main">{t("Servings")}</div>
                    <Stepper
                      value={qty}
                      min={0.5}
                      step={qty < 1 ? 0.5 : 1}
                      decrementStep={qty <= 1 ? 0.5 : 1}
                      label={t("servings")}
                      onChange={(v) => setQty(v > 1 ? Math.round(v) : v)}
                      format={(v) =>
                        v === 0.5 ? "½" : v % 1 ? v.toFixed(1) : String(v)
                      }
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="section-header">{t("Portion")}</div>
                <div className="chips" style={{ paddingInline: 16 }}>
                  {servings.map((s, i) => (
                    <button
                      key={s.label + i}
                      className={`chip ${i === servingIdx ? "active" : ""}`}
                      onClick={() => {
                        setServingIdx(i);
                        setQty(
                          s.grams === 1
                            ? Math.round(serving.grams * qty) || 100
                            : 1,
                        );
                      }}
                    >
                      {s.grams === 1
                        ? t("Grams")
                        : s.label === "100 g"
                          ? "100 g"
                          : `${s.label} (${s.grams} g)`}
                    </button>
                  ))}
                </div>
                <div className="group" style={{ marginTop: 10 }}>
                  <div className="row">
                    <div className="row-main">
                      {isGramMode ? t("Weight (g)") : t("Quantity")}
                    </div>
                    {isGramMode ? (
                      <input
                        className="num-input"
                        style={{ width: 90 }}
                        inputMode="decimal"
                        value={qty}
                        onChange={(e) =>
                          setQty(
                            Math.max(
                              0,
                              Number(e.target.value.replace(/[^\d.]/g, "")) ||
                                0,
                            ),
                          )
                        }
                        aria-label={t("Weight in grams")}
                      />
                    ) : (
                      <Stepper
                        value={qty}
                        min={0.5}
                        // Whole servings (1 → 2 → 3); a half portion is available below one.
                        step={qty < 1 ? 0.5 : 1}
                        decrementStep={qty <= 1 ? 0.5 : 1}
                        onChange={(v) => setQty(v > 1 ? Math.round(v) : v)}
                        format={(v) =>
                          v === 0.5 ? "½" : v % 1 ? v.toFixed(1) : String(v)
                        }
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {!onPick && (
              <>
                <div className="section-header">{t("Meal")}</div>
                <Segmented value={meal} options={mealOptions()} onChange={setMeal} />
              </>
            )}

            <div className="section-header">{t("Is it good for me?")}</div>
            <AvoidCard conflicts={foodConflicts(food, profile)} />
            <SuitabilityCard s={withConflicts(suitability(n, tg, eaten, profile.goal, isWholeProduce(food)), foodConflicts(food, profile))} />
            <div className="spacer" />
            <HealthCard
              report={healthReport(n, { intrinsicSugar: isWholeProduce(food) })}
            />

            <div className="section-header">{t("Nutrition for this portion")}</div>
            <NutritionTable n={n} />

            <div className="sheet-cta">
              <button className="btn" onClick={add} disabled={grams <= 0}>
                {onPick
                  ? (pickLabel ?? t("Add to meal"))
                  : t("Add to {meal}", { meal: mealLabel(meal) })}
              </button>
            </div>
          </>
        )}
      </Sheet>
      <FoodPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(f) => {
          setParts((list) => [
            ...list,
            {
              food: f.name,
              label: f.name,
              unit: f.servings[0].label,
              unitGrams: f.servings[0].grams,
              qty: 1,
              step: 1,
              extra: true,
              per100: f.per100,
            },
          ]);
          setPicking(false);
        }}
      />
    </>
  );
}
