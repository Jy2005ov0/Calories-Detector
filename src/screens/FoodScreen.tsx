import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronRight, Globe, PencilLine, Plus, Search, Trash2, UtensilsCrossed, X } from "lucide-react";
import { FOODS, FOOD_CATEGORIES } from "../data/foods";
import { MEALS, defaultMeal, searchOnline } from "../lib/api";
import { plural } from "../lib/fitness";
import { healthReport, isWholeProduce, round, scale, searchFoods, sum } from "../lib/nutrition";
import { actions, todayKey, useStore } from "../lib/store";
import type { CustomMeal, Food } from "../lib/types";
import { FoodSheet } from "../components/FoodSheet";
import { CustomFoodSheet, MealBuilder } from "../components/MealBuilder";
import { Empty, GRADE_COLORS, Segmented, haptic, showToast } from "../components/ui";

type View = "recent" | "meals" | "mine" | "browse";

function FoodRow({ f, onClick }: { f: Food; onClick: () => void }) {
  const s = f.servings[0];
  const kcal = round((f.per100.kcal * s.grams) / 100);
  const grade = healthReport(scale(f.per100, s.grams), { intrinsicSugar: isWholeProduce(f) }).grade;
  return (
    <button className="row" onClick={onClick}>
      <div className="row-main">
        <div className="row-title">{f.name}</div>
        <div className="row-sub">
          {f.brand ? `${f.brand} · ` : ""}
          {s.label} · {kcal} kcal
        </div>
      </div>
      <span className="badge" style={{ background: GRADE_COLORS[grade], color: "#fff", minWidth: 22, justifyContent: "center" }}>
        {grade}
      </span>
      <ChevronRight size={16} className="chev" />
    </button>
  );
}

export function FoodScreen({ openPhoto }: { openPhoto: () => void }) {
  const customFoods = useStore((s) => s.customFoods);
  const customMeals = useStore((s) => s.customMeals);
  const recentIds = useStore((s) => s.recentFoodIds);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("recent");
  const [category, setCategory] = useState(FOOD_CATEGORIES[0]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [builder, setBuilder] = useState<{ open: boolean; meal: CustomMeal | null }>({ open: false, meal: null });
  const [newFood, setNewFood] = useState(false);
  const [online, setOnline] = useState<{ loading: boolean; items: Food[]; error?: string }>({ loading: false, items: [] });

  const all = useMemo(() => [...customFoods, ...FOODS], [customFoods]);
  const byId = useMemo(() => new Map(all.map((f) => [f.id, f])), [all]);
  const local = useMemo(() => (q.trim() ? searchFoods(all, q) : []), [all, q]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setOnline({ loading: false, items: [] });
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setOnline((o) => ({ ...o, loading: true, error: undefined }));
      searchOnline(term, ctrl.signal)
        .then((items) => setOnline({ loading: false, items }))
        .catch((e: Error) => {
          if (e.name !== "AbortError") setOnline({ loading: false, items: [], error: "Online search unavailable right now." });
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const recent = recentIds.map((id) => byId.get(id)).filter((f): f is Food => !!f);

  const logMeal = (m: CustomMeal) => {
    const meal = defaultMeal();
    actions.addLog(
      m.items.map((i) => ({ date: todayKey(), meal, name: i.name, grams: i.grams, nutrients: scale(i.per100, i.grams), source: "custom" as const })),
    );
    const kcal = sum(m.items.map((i) => scale(i.per100, i.grams))).kcal;
    haptic();
    showToast(`${m.name} → ${MEALS.find((x) => x.value === meal)!.label} · ${round(kcal)} kcal`);
  };

  return (
    <div className="screen">
      <h1 className="large-title" style={{ marginTop: 14 }}>
        Food
      </h1>
      <p className="subtitle">{FOODS.length}+ foods built in, plus millions of packaged products online.</p>

      <div className="search" data-tour="food-search">
        <Search size={17} />
        <input
          placeholder="Search nasi lemak, chicken breast, Milo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          enterKeyHint="search"
          aria-label="Search foods"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Clear search" style={{ display: "grid", color: "var(--label-3)" }}>
            <X size={17} />
          </button>
        )}
      </div>

      {!q && (
        <>
          <div className="tiles" data-tour="food-tools" style={{ marginTop: 14, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <button className="tile" onClick={openPhoto} style={{ minHeight: 96 }}>
              <div className="icon-tile" style={{ background: "var(--blue)" }}>
                <Camera size={17} />
              </div>
              <div className="tile-title" style={{ fontSize: 15 }}>
                Scan photo
              </div>
            </button>
            <button className="tile" onClick={() => setBuilder({ open: true, meal: null })} style={{ minHeight: 96 }}>
              <div className="icon-tile" style={{ background: "var(--green)" }}>
                <UtensilsCrossed size={17} />
              </div>
              <div className="tile-title" style={{ fontSize: 15 }}>
                Build meal
              </div>
            </button>
            <button className="tile" onClick={() => setNewFood(true)} style={{ minHeight: 96 }}>
              <div className="icon-tile" style={{ background: "var(--purple)" }}>
                <PencilLine size={17} />
              </div>
              <div className="tile-title" style={{ fontSize: 15 }}>
                New food
              </div>
            </button>
          </div>

          <div style={{ marginTop: 22 }}>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "recent", label: "Recent" },
                { value: "meals", label: "My Meals" },
                { value: "mine", label: "My Foods" },
                { value: "browse", label: "Browse" },
              ]}
            />
          </div>

          {view === "recent" && (
            <div className="group" style={{ marginTop: 12 }}>
              {recent.length ? (
                recent.map((f) => <FoodRow key={f.id} f={f} onClick={() => setSelected(f)} />)
              ) : (
                <Empty icon={<Search size={28} />}>Foods you log will show up here for one-tap adding.</Empty>
              )}
            </div>
          )}

          {view === "meals" && (
            <>
              <div className="group" style={{ marginTop: 12 }}>
                {customMeals.length ? (
                  customMeals.map((m) => {
                    const kcal = sum(m.items.map((i) => scale(i.per100, i.grams))).kcal;
                    return (
                      <div className="row" key={m.id}>
                        <button className="row-main pressable" style={{ textAlign: "left" }} onClick={() => setBuilder({ open: true, meal: m })}>
                          <div className="row-title">{m.name}</div>
                          <div className="row-sub">
                            {plural(m.items.length, "item")} · {round(kcal)} kcal
                          </div>
                        </button>
                        <button className="btn small tinted" onClick={() => logMeal(m)}>
                          <Plus size={15} /> Log
                        </button>
                        <button
                          className="icon-btn"
                          aria-label={`Delete ${m.name}`}
                          onClick={() => {
                            actions.deleteCustomMeal(m.id);
                            showToast(`Deleted ${m.name}`, { label: "Undo", run: () => actions.saveCustomMeal(m) });
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <Empty icon={<UtensilsCrossed size={28} />}>Build a meal from any foods and quantities, then save it to log it again in one tap.</Empty>
                )}
              </div>
              <div className="spacer" />
              <button className="btn tinted" onClick={() => setBuilder({ open: true, meal: null })}>
                <Plus size={18} /> Build a meal
              </button>
            </>
          )}

          {view === "mine" && (
            <>
              <div className="group" style={{ marginTop: 12 }}>
                {customFoods.length ? (
                  customFoods.map((f) => <FoodRow key={f.id} f={f} onClick={() => setSelected(f)} />)
                ) : (
                  <Empty icon={<PencilLine size={28} />}>Add your own foods or recipes with their nutrition label.</Empty>
                )}
              </div>
              <div className="spacer" />
              <button className="btn tinted" onClick={() => setNewFood(true)}>
                <Plus size={18} /> New food
              </button>
            </>
          )}

          {view === "browse" && (
            <>
              <div className="chips" style={{ marginTop: 12 }}>
                {FOOD_CATEGORIES.map((c) => (
                  <button key={c} className={`chip ${c === category ? "active" : ""}`} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="group" style={{ marginTop: 10 }}>
                {FOODS.filter((f) => f.category === category).map((f) => (
                  <FoodRow key={f.id} f={f} onClick={() => setSelected(f)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {q && (
        <>
          <div className="section-header">Foods · {local.length}</div>
          <div className="group">
            {local.length ? (
              local.map((f) => <FoodRow key={f.id} f={f} onClick={() => setSelected(f)} />)
            ) : (
              <div className="row muted" style={{ fontSize: 15 }}>
                No built-in matches
              </div>
            )}
          </div>

          {q.trim().length >= 3 && (
            <>
              <div className="section-header">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Globe size={13} /> Packaged products · Open Food Facts
                </span>
                {online.loading && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
              </div>
              <div className="group">
                {online.items.map((f) => (
                  <FoodRow key={f.id} f={f} onClick={() => setSelected(f)} />
                ))}
                {!online.loading && online.items.length === 0 && (
                  <div className="row muted" style={{ fontSize: 15 }}>
                    {online.error ?? "No packaged products found"}
                  </div>
                )}
              </div>
            </>
          )}
          <p className="footnote">
            Can't find it?{" "}
            <button className="link" onClick={() => setNewFood(true)}>
              Create a custom food
            </button>{" "}
            or{" "}
            <button className="link" onClick={openPhoto}>
              scan a photo
            </button>
            .
          </p>
        </>
      )}

      <FoodSheet food={selected} onClose={() => setSelected(null)} />
      <MealBuilder open={builder.open} initial={builder.meal} onClose={() => setBuilder({ open: false, meal: null })} />
      <CustomFoodSheet open={newFood} onClose={() => setNewFood(false)} />
    </div>
  );
}
