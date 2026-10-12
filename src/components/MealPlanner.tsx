import { useMemo, useState } from "react";
import { Share } from "@capacitor/share";
import { ChevronLeft, ChevronRight, ListChecks, Plus, Trash2 } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { mealLabel, mealOptions } from "../lib/api";
import { round, scale, sum, targets } from "../lib/nutrition";
import { isNative } from "../lib/platform";
import { addDays } from "../lib/progress";
import { actions, getState, useStore, useTodayKey, weekdayOf } from "../lib/store";
import type { Food, MealType, PlannedMeal } from "../lib/types";
import { FoodPicker } from "./MealBuilder";
import { NumberInput, Sheet, haptic, showToast } from "./ui";
import { FoodIcon, MealIcon } from "./FoodIcon";

const fmtDay = (key: string, opts: Intl.DateTimeFormatOptions) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), opts);
};

export interface GroceryItem {
  foodId: string;
  name: string;
  grams: number;
}

/** Everything planned for a week, added up per food, biggest amounts first. */
export function groceryList(plan: PlannedMeal[], weekStart: string): GroceryItem[] {
  const end = addDays(weekStart, 6);
  const map = new Map<string, GroceryItem>();
  for (const p of plan) {
    if (p.date < weekStart || p.date > end) continue;
    for (const it of p.items) {
      const cur = map.get(it.foodId) ?? { foodId: it.foodId, name: it.name, grams: 0 };
      cur.grams += it.grams;
      map.set(it.foodId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.grams - a.grams);
}

const amount = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(g >= 10000 ? 0 : 1)} kg` : `${Math.round(g)} g`);

/** Plan the week's meals; log a planned meal in one tap and get a shopping list. */
export function MealPlanner() {
  useLanguage();
  const today = useTodayKey();
  const plan = useStore((s) => s.mealPlan);
  const profile = useStore((s) => s.profile);
  const [weekOffset, setWeekOffset] = useState(0);
  const thisMonday = addDays(today, -weekdayOf(today));
  const weekStart = addDays(thisMonday, weekOffset * 7);
  const [day, setDay] = useState(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selected = days.includes(day) ? day : days[0];
  const [adding, setAdding] = useState<MealType | null>(null);
  const [grocery, setGrocery] = useState(false);
  const tg = targets(profile);
  const forDay = plan.filter((p) => p.date === selected);
  const dayKcal = sum(forDay.flatMap((p) => p.items.map((it) => scale(it.per100, it.grams)))).kcal;

  const pick = (f: Food) => {
    if (!adding) return;
    actions.addPlanned(selected, adding, { foodId: f.id, name: f.name, grams: f.servings[0]?.grams ?? 100, per100: f.per100 });
    haptic("light");
    setAdding(null);
  };

  return (
    <>
      <div className="week-nav">
        <button className="icon-btn" aria-label={t("Previous week")} onClick={() => setWeekOffset((w) => Math.max(-4, w - 1))}>
          <ChevronLeft size={18} />
        </button>
        <span className="tile-title">
          {weekOffset === 0 ? t("This week") : weekOffset === 1 ? t("Next week") : `${fmtDay(weekStart, { day: "numeric", month: "short" })} – ${fmtDay(addDays(weekStart, 6), { day: "numeric", month: "short" })}`}
        </span>
        <button className="icon-btn" aria-label={t("Next week")} onClick={() => setWeekOffset((w) => Math.min(4, w + 1))}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="day-strip" role="tablist" aria-label={t("Day")}>
        {days.map((d) => {
          const n = plan.filter((p) => p.date === d).reduce((a, p) => a + p.items.length, 0);
          return (
            <button key={d} role="tab" aria-selected={d === selected} className={`${d === selected ? "active" : ""} ${d === today ? "today" : ""}`} onClick={() => setDay(d)}>
              <span>{fmtDay(d, { weekday: "short" })}</span>
              <strong>{fmtDay(d, { day: "numeric" })}</strong>
              {n > 0 && <i className="dot" aria-label={t("{n} planned", { n })} />}
            </button>
          );
        })}
      </div>
      <div className="card plan-total">
        <span>{fmtDay(selected, { weekday: "long", day: "numeric", month: "long" })}</span>
        <span className="tabular" style={{ fontWeight: 600 }}>
          {round(dayKcal)} / {tg.kcal} kcal
        </span>
      </div>
      {mealOptions().map(({ value: m }) => {
        const p = forDay.find((x) => x.meal === m);
        const kcal = p ? sum(p.items.map((it) => scale(it.per100, it.grams))).kcal : 0;
        return (
          <div key={m}>
            <div className="section-header">
              <span className="meal-head">
                <MealIcon meal={m} ramadan={getState().profile.fasting === "ramadan"} />
                {mealLabel(m)}
                {p ? ` · ${round(kcal)} kcal` : ""}
              </span>
              <span style={{ display: "flex", gap: 14 }}>
                {p && selected === today && (
                  <button
                    onClick={() => {
                      actions.addLog(p.items.map((it) => ({ date: today, meal: m, name: it.name, grams: it.grams, nutrients: scale(it.per100, it.grams), source: "db" as const })));
                      haptic("success");
                      showToast(t("Logged {meal} from your plan · {kcal} kcal", { meal: mealLabel(m), kcal: round(kcal) }));
                    }}
                  >
                    {t("Log it")}
                  </button>
                )}
                <button onClick={() => setAdding(m)} aria-label={t("Plan a food for {meal}", { meal: mealLabel(m) })}>
                  <Plus size={16} style={{ verticalAlign: -3 }} /> {t("Add")}
                </button>
              </span>
            </div>
            <div className="group">
              {!p ? (
                <div className="row muted" style={{ fontSize: 15 }}>
                  {t("Nothing planned")}
                </div>
              ) : (
                p.items.map((it, i) => (
                  <div className="row" key={`${it.foodId}-${i}`}>
                    <FoodIcon name={it.name} size={36} />
                    <div className="row-main">
                      <div className="row-title">{it.name}</div>
                      <div className="row-sub">{round(scale(it.per100, it.grams).kcal)} kcal</div>
                    </div>
                    <NumberInput className="grams-input" aria-label={t("Grams of {name}", { name: it.name })} value={it.grams} min={1} max={3000} onChange={(g) => actions.setPlannedGrams(p.id, i, g)} />
                    <span className="muted">g</span>
                    <button className="icon-btn" aria-label={t("Remove {name}", { name: it.name })} onClick={() => actions.removePlanned(p.id, i)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
      <div className="spacer" />
      <button className="btn tinted" onClick={() => setGrocery(true)}>
        <ListChecks size={18} /> {t("Grocery list for the week")}
      </button>
      <FoodPicker open={adding !== null} onClose={() => setAdding(null)} onPick={pick} />
      <GrocerySheet open={grocery} onClose={() => setGrocery(false)} weekStart={weekStart} />
    </>
  );
}

function GrocerySheet({ open, onClose, weekStart }: { open: boolean; onClose: () => void; weekStart: string }) {
  useLanguage();
  const plan = useStore((s) => s.mealPlan);
  const done = useStore((s) => s.groceryDone);
  const list = useMemo(() => groceryList(plan, weekStart), [plan, weekStart]);
  const key = (id: string) => `${weekStart}|${id}`;
  const left = list.filter((i) => !done.includes(key(i.foodId)));
  const share = async () => {
    const text = `${t("Grocery list")}\n` + left.map((i) => `• ${i.name}: ${amount(i.grams)}`).join("\n");
    try {
      if (isNative) await Share.share({ title: t("Grocery list"), text });
      else if (navigator.share) await navigator.share({ title: t("Grocery list"), text });
      else {
        await navigator.clipboard.writeText(text);
        showToast(t("Copied the list"));
      }
    } catch {
      /* cancelled */
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("Grocery list")}>
      <p className="footnote" style={{ marginTop: 0 }}>
        {t("Everything in your meal plan for the week, added up. Amounts are cooked or as-eaten weights.")}
      </p>
      <div className="group" data-testid="grocery">
        {list.length === 0 ? (
          <div className="row muted">{t("Plan some meals first and the list fills itself.")}</div>
        ) : (
          list.map((i) => {
            const on = done.includes(key(i.foodId));
            return (
              <button key={i.foodId} className="row with-icon" role="checkbox" aria-checked={on} onClick={() => actions.toggleGrocery(key(i.foodId))}>
                <span className={`tick ${on ? "on" : ""}`} aria-hidden>
                  {on ? "✓" : ""}
                </span>
                <span className="row-main row-title" style={{ textDecoration: on ? "line-through" : undefined, opacity: on ? 0.6 : 1 }}>
                  {i.name}
                </span>
                <span className="row-value tabular">{amount(i.grams)}</span>
              </button>
            );
          })
        )}
      </div>
      {list.length > 0 && (
        <>
          <div className="spacer" />
          <button className="btn" onClick={share}>
            {t("Share the list")}
          </button>
        </>
      )}
    </Sheet>
  );
}
