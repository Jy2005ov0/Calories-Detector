import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { FOODS } from "../data/foods";
import { useUsda } from "../lib/usda";
import { t, useLanguage } from "../i18n";
import { defaultMeal, mealOptions } from "../lib/api";
import { healthReport, round, scale, searchFoods, suitability, sum, targets } from "../lib/nutrition";
import { actions, todayKey, uid, useStore } from "../lib/store";
import type { CustomMeal, Food, MealType } from "../lib/types";
import { useTodayTotals } from "./FoodSheet";
import { Empty, HealthCard, MacroBars, Segmented, Sheet, SuitabilityCard, haptic, showToast } from "./ui";

type Item = CustomMeal["items"][number];

export function MealBuilder({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: CustomMeal | null }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const eaten = useTodayTotals();
  const [name, setName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [meal, setMeal] = useState<MealType>(defaultMeal());
  const [picking, setPicking] = useState(false);
  // One id per opening, so saving again updates the same meal instead of adding a copy.
  const [mealId, setMealId] = useState(() => initial?.id ?? uid());

  useEffect(() => {
    if (open) {
      setMealId(initial?.id ?? uid());
      setName(initial?.name ?? "");
      setItems(initial?.items ?? []);
      setMeal(defaultMeal());
    }
  }, [open, initial]);

  const total = useMemo(() => sum(items.map((i) => scale(i.per100, i.grams))), [items]);
  const tg = targets(profile);

  const addFood = (f: Food) => {
    setItems((l) => [...l, { foodId: f.id, name: f.name, grams: f.servings[0]?.grams ?? 100, per100: f.per100 }]);
    setPicking(false);
  };

  const log = () => {
    actions.addLog(
      items.map((i) => ({ date: todayKey(), meal, name: i.name, grams: i.grams, nutrients: scale(i.per100, i.grams), source: "custom" as const })),
    );
    haptic();
    showToast(t("Logged {name} · {kcal} kcal", { name: name || t("meal"), kcal: round(total.kcal) }));
    onClose();
  };

  const save = () => {
    actions.saveCustomMeal({ id: mealId, name: name.trim() || t("My meal"), items });
    haptic();
    showToast(t("Meal saved to My Meals"));
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={initial ? t("Edit meal") : t("Build a meal")}>
        <input className="text-input" placeholder={t("Meal name (e.g. Post-gym bowl)")} value={name} onChange={(e) => setName(e.target.value)} />

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="big-number">{round(total.kcal)}</span>
            <span className="muted">kcal</span>
          </div>
          <div className="spacer" />
          <MacroBars n={total} />
        </div>

        <div className="section-header">
          {t("Ingredients")}
          <button onClick={() => setPicking(true)}>{t("Add food")}</button>
        </div>
        {items.length === 0 ? (
          <div className="group">
            <Empty icon={<UtensilsCrossed size={28} />}>{t("Add foods and set how much of each you'll eat.")}</Empty>
          </div>
        ) : (
          <div className="group">
            {items.map((it, idx) => {
              const n = scale(it.per100, it.grams);
              return (
                <div className="row" key={idx}>
                  <div className="row-main">
                    <div className="row-title">{it.name}</div>
                    <div className="row-sub">
                      {round(n.kcal)} kcal · P {round(n.protein)} · C {round(n.carbs)} · F {round(n.fat)}
                    </div>
                  </div>
                  <input
                    className="num-input"
                    inputMode="numeric"
                    value={it.grams}
                    aria-label={t("{name} grams", { name: it.name })}
                    onChange={(e) => {
                      const g = Number(e.target.value.replace(/\D/g, "")) || 0;
                      setItems((l) => l.map((x, j) => (j === idx ? { ...x, grams: g } : x)));
                    }}
                  />
                  <span className="muted" style={{ fontSize: 14 }}>
                    g
                  </span>
                  <button className="icon-btn" aria-label={t("Remove {name}", { name: it.name })} onClick={() => setItems((l) => l.filter((_, j) => j !== idx))}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            <button className="row" onClick={() => setPicking(true)} style={{ color: "var(--blue)" }}>
              <Plus size={18} /> {t("Add another food")}
            </button>
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="section-header">{t("Is it good for me?")}</div>
            <SuitabilityCard s={suitability(total, tg, eaten, profile.goal)} />
            <div className="spacer" />
            <HealthCard report={healthReport(total)} />

            <div className="section-header">{t("Log to")}</div>
            <Segmented value={meal} options={mealOptions()} onChange={setMeal} />
            <div className="spacer" />
            <div className="btn-row">
              <button className="btn secondary" onClick={save}>
                {t("Save meal")}
              </button>
              <button className="btn" onClick={log}>
                {t("Log meal")}
              </button>
            </div>
          </>
        )}
      </Sheet>
      <FoodPicker open={picking} onClose={() => setPicking(false)} onPick={addFood} />
    </>
  );
}

export function FoodPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: Food) => void }) {
  useLanguage();
  const customFoods = useStore((s) => s.customFoods);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);
  const usda = useUsda();
  const all = useMemo(() => [...customFoods, ...FOODS], [customFoods]);
  // App foods first, then matches from the USDA reference database.
  const results = useMemo(() => [...searchFoods(all, q, 40), ...(q.trim().length >= 2 ? searchFoods(usda, q, 20) : [])], [all, usda, q]);
  return (
    <Sheet open={open} onClose={onClose} title={t("Add food")}>
      <div className="search">
        <Search size={17} />
        <input autoFocus placeholder={t("Search foods")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="group" style={{ marginTop: 12 }}>
        {results.map((f) => (
          <button className="row" key={f.id} onClick={() => onPick(f)}>
            <div className="row-main">
              <div className="row-title">{f.name}</div>
              <div className="row-sub">
                {round((f.per100.kcal * f.servings[0].grams) / 100)} kcal · {f.servings[0].label}
              </div>
            </div>
            <Plus size={18} color="var(--blue)" />
          </button>
        ))}
        {results.length === 0 && <div className="empty">{t("No matches. Try another word.")}</div>}
      </div>
    </Sheet>
  );
}

export function CustomFoodSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const blank = { name: "", serving: "100", kcal: "", protein: "", carbs: "", fat: "", sugar: "", fiber: "", satFat: "", sodium: "" };
  const [v, setV] = useState(blank);
  useEffect(() => {
    if (open) setV(blank);
  }, [open]);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const n = (s: string) => Math.max(0, parseFloat(s) || 0);
  const g = n(v.serving);
  const valid = v.name.trim() && g > 0 && v.kcal !== "";

  const save = () => {
    const f = 100 / g;
    actions.addCustomFood({
      id: `custom-${uid()}`,
      name: v.name.trim(),
      category: "My Foods",
      per100: {
        kcal: n(v.kcal) * f,
        protein: n(v.protein) * f,
        carbs: n(v.carbs) * f,
        fat: n(v.fat) * f,
        sugar: n(v.sugar) * f,
        fiber: n(v.fiber) * f,
        satFat: n(v.satFat) * f,
        sodium: n(v.sodium) * f,
      },
      servings: [{ label: "1 serving", grams: g }],
      source: "custom",
    });
    haptic();
    showToast(t("{name} added to My Foods", { name: v.name.trim() }));
    onClose();
  };

  const fields: [keyof typeof blank, string, string][] = [
    ["serving", t("Serving size"), "g"],
    ["kcal", t("Calories"), "kcal"],
    ["protein", t("Protein"), "g"],
    ["carbs", t("Carbohydrate"), "g"],
    ["sugar", t("Sugar"), "g"],
    ["fiber", t("Fibre"), "g"],
    ["fat", t("Fat"), "g"],
    ["satFat", t("Saturated fat"), "g"],
    ["sodium", t("Sodium"), "mg"],
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("New food")}
      left={
        <button className="link" onClick={onClose}>
          {t("Cancel")}
        </button>
      }
      right={
        <button className="link bold" onClick={save} disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }}>
          {t("Save")}
        </button>
      }
    >
      <input className="text-input" placeholder={t("Food name")} value={v.name} onChange={set("name")} />
      <div className="section-header">{t("Per serving (copy from the label)")}</div>
      <div className="group">
        {fields.map(([k, label, unit]) => (
          <div className="field" key={k}>
            <label htmlFor={`cf-${k}`}>{label}</label>
            <input id={`cf-${k}`} inputMode="decimal" placeholder="0" value={v[k]} onChange={set(k)} />
            <span className="muted" style={{ width: 34 }}>
              {unit}
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
