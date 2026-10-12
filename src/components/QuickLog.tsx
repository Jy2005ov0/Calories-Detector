import { useEffect, useMemo, useState } from "react";
import { Mic, MicOff, Trash2 } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { FOODS } from "../data/foods";
import { defaultMeal, mealLabel, mealOptions } from "../lib/api";
import { ZERO, round, scale } from "../lib/nutrition";
import { actions, todayKey, useStore } from "../lib/store";
import { useWorldFoods } from "../lib/usda";
import { canListen, listenOnce, matchSpoken, parseSpoken } from "../lib/voice";
import type { Food, MealType } from "../lib/types";
import { NumberInput, Segmented, Sheet, haptic, showToast } from "./ui";
import { FoodIcon } from "./FoodIcon";

/** Log calories without looking up a food: just a number (and macros if known). */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [meal, setMeal] = useState<MealType>(defaultMeal());
  useEffect(() => {
    if (!open) return;
    setName("");
    setKcal(0);
    setProtein(0);
    setCarbs(0);
    setFat(0);
    setMeal(defaultMeal());
  }, [open]);
  const valid = kcal > 0 && kcal <= 5000;
  const add = () => {
    actions.addLog([
      { date: todayKey(), meal, name: name.trim() || t("Quick add"), grams: 0, nutrients: { ...ZERO, kcal, protein, carbs, fat }, source: "custom" },
    ]);
    haptic("success");
    showToast(t("Added {name} · {kcal} kcal", { name: name.trim() || t("Quick add"), kcal: round(kcal) }));
    onClose();
  };
  const field = (id: string, label: string, value: number, set: (v: number) => void, unit: string, max: number) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <NumberInput id={id} value={value} onChange={set} min={0} max={max} emptyValue={0} placeholder="0" />
      <span className="muted" style={{ width: 34 }}>
        {unit}
      </span>
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title={t("Quick add")}>
      <p className="footnote" style={{ marginTop: 0 }}>
        {t("Know the calories but not the food? Log the number. Protein, carbs and fat are optional.")}
      </p>
      <div className="group">
        <div className="field">
          <label htmlFor="qa-name">{t("Name")}</label>
          <input id="qa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Optional")} maxLength={60} />
        </div>
        {field("qa-kcal", t("Calories"), kcal, setKcal, "kcal", 5000)}
        {field("qa-protein", t("Protein"), protein, setProtein, "g", 500)}
        {field("qa-carbs", t("Carbs"), carbs, setCarbs, "g", 1000)}
        {field("qa-fat", t("Fat"), fat, setFat, "g", 500)}
      </div>
      <div className="section-header">{t("Meal")}</div>
      <Segmented value={meal} onChange={setMeal} options={mealOptions()} ariaLabel={t("Meal")} />
      <div className="spacer" />
      <button className="btn" disabled={!valid} onClick={add}>
        {t("Add to {meal}", { meal: mealLabel(meal) })}
      </button>
    </Sheet>
  );
}

interface Match {
  key: string;
  said: string;
  food: Food | null;
  grams: number;
}

/** Say (or type) what you ate in plain words; W finds each food and its amount. */
export function VoiceLogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLanguage();
  const customFoods = useStore((s) => s.customFoods);
  const favorites = useStore((s) => s.favorites);
  const world = useWorldFoods();
  const foods = useMemo(() => [...customFoods, ...favorites, ...FOODS, ...world], [customFoods, favorites, world]);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [meal, setMeal] = useState<MealType>(defaultMeal());
  const [matches, setMatches] = useState<Match[]>([]);
  useEffect(() => {
    if (!open) return;
    setText("");
    setMatches([]);
    setMeal(defaultMeal());
    canListen().then(setMicOk);
  }, [open]);

  const understand = (said: string) => {
    const { meal: m, items } = parseSpoken(said);
    if (m && mealOptions().some((o) => o.value === m)) setMeal(m);
    setMatches(matchSpoken(items, foods).map((x, i) => ({ key: `${i}-${x.item.query}`, said: x.item.query, food: x.food, grams: x.grams })));
  };

  const listen = async () => {
    setListening(true);
    try {
      const said = await listenOnce(lang);
      if (said) {
        setText(said);
        understand(said);
      } else showToast(t("Didn't catch that. Try again, or type it."));
    } catch {
      showToast(t("Couldn't use the microphone. You can type instead."));
    } finally {
      setListening(false);
    }
  };

  const found = matches.filter((m) => m.food && m.grams > 0);
  const logAll = () => {
    actions.addLog(
      found.map((m) => ({ date: todayKey(), meal, name: m.food!.name, grams: m.grams, nutrients: scale(m.food!.per100, m.grams), source: m.food!.source })),
    );
    found.forEach((m) => actions.touchRecent(m.food!.id));
    const kcal = found.reduce((a, m) => a + scale(m.food!.per100, m.grams).kcal, 0);
    haptic("success");
    showToast(t("Logged {n} foods to {meal} · {kcal} kcal", { n: found.length, meal: mealLabel(meal), kcal: round(kcal) }));
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("Say what you ate")}>
      <p className="footnote" style={{ marginTop: 0 }}>
        {t("For example: “dua roti canai dan teh tarik”, “200 g rice and chicken curry” or “两碗白饭和一杯咖啡”.")}
      </p>
      {micOk && (
        <button className={`btn ${listening ? "secondary" : ""}`} onClick={listen} disabled={listening} aria-live="polite">
          {listening ? <MicOff size={18} /> : <Mic size={18} />} {listening ? t("Listening…") : t("Tap and speak")}
        </button>
      )}
      <div className="group" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="voice-text" className="sr-only">
            {t("What you ate")}
          </label>
          <input
            id="voice-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && understand(text)}
            placeholder={t("Or type it here")}
            enterKeyHint="go"
          />
        </div>
      </div>
      <div className="spacer" />
      <button className="btn tinted" disabled={!text.trim()} onClick={() => understand(text)}>
        {t("Find foods")}
      </button>

      {matches.length > 0 && (
        <>
          <div className="section-header">{t("Found")}</div>
          <div className="group" data-testid="voice-matches">
            {matches.map((m) => (
              <div className="row" key={m.key}>
                {m.food && <FoodIcon name={m.food.name} category={m.food.category} size={36} />}
                <div className="row-main">
                  <div className="row-title">{m.food ? m.food.name : t("No match for “{text}”", { text: m.said })}</div>
                  {m.food && (
                    <div className="row-sub">
                      {round(scale(m.food.per100, m.grams).kcal)} kcal · “{m.said}”
                    </div>
                  )}
                </div>
                {m.food && (
                  <NumberInput
                    className="grams-input"
                    aria-label={t("Grams of {name}", { name: m.food.name })}
                    value={m.grams}
                    min={1}
                    max={3000}
                    onChange={(g) => setMatches((list) => list.map((x) => (x.key === m.key ? { ...x, grams: g } : x)))}
                  />
                )}
                <button className="icon-btn" aria-label={t("Remove {name}", { name: m.food?.name ?? m.said })} onClick={() => setMatches((list) => list.filter((x) => x.key !== m.key))}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="section-header">{t("Meal")}</div>
          <Segmented value={meal} onChange={setMeal} options={mealOptions()} ariaLabel={t("Meal")} />
          <div className="spacer" />
          <button className="btn" disabled={!found.length} onClick={logAll}>
            {t("Log {n} foods", { n: found.length })}
          </button>
        </>
      )}
    </Sheet>
  );
}
