import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Lightbulb, LogIn, Plus } from "lucide-react";
import { t as tr, useLanguage } from "../i18n";
import { FOODS } from "../data/foods";
import { FoodSheet } from "../components/FoodSheet";
import { SPRING, Segmented, Stepper, haptic, showToast } from "../components/ui";
import { mealTiming, recommendedFoods, sampleDay } from "../lib/diet";
import { dislikeLabel } from "../lib/allergens";
import { SPLITS, WEEKDAYS, buildPlan, sessionFromPlan, type PlannedDay } from "../lib/fitness";
import { bmr, round, targets, tdee } from "../lib/nutrition";
import { actions, todayKey, useStore, useTodayKey, weekdayOf } from "../lib/store";
import type { Food, MealType } from "../lib/types";
import type { Tab } from "../App";

/** Two-letter badge for a training day: "Chest Day" → CH, "Hari Dada" → DA, "胸部日" → 胸. */
function dayMark(title: string) {
  const core = title.replace(/ Day$/, "").replace(/^Hari /, "");
  return /[\u4e00-\u9fff]/.test(core) ? core.slice(0, 1) : core.slice(0, 2).toUpperCase();
}

export function Plan({ go }: { go: (t: Tab) => void }) {
  useLanguage();
  const [view, setView] = useState<"training" | "nutrition">("training");
  return (
    <div className="screen">
      <h1 className="large-title" style={{ marginTop: 14 }}>
        {tr("Plan")}
      </h1>
      <p className="subtitle">{tr("Built from your profile and goal. Change your profile to update it.")}</p>
      <div data-tour="plan-tabs">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "training", label: tr("Training") },
            { value: "nutrition", label: tr("Nutrition") },
          ]}
        />
      </div>
      {view === "training" ? <TrainingPlan go={go} /> : <NutritionPlan />}
    </div>
  );
}

function TrainingPlan({ go }: { go: (t: Tab) => void }) {
  const lang = useLanguage();
  const profile = useStore((s) => s.profile);
  const split = useStore((s) => s.split);
  const activeId = useStore((s) => s.activeSessionId);
  const plan = useMemo(() => buildPlan(profile, split), [profile, split, lang]);
  const today = weekdayOf(useTodayKey());
  const [open, setOpen] = useState<string | null>(plan.days.find((d) => d.weekday === today)?.key ?? plan.days[0]?.key ?? null);

  const start = (d: PlannedDay) => {
    if (activeId) {
      showToast(tr("You're already clocked in"));
      go("train");
      return;
    }
    actions.clockIn(d.title, sessionFromPlan(d));
    haptic("success");
    go("train");
  };

  return (
    <>
      <div className="section-header">{tr("Split")}</div>
      <div className="chips" data-tour="split">
        {SPLITS.map((s) => (
          <button key={s.id} className={`chip ${split === s.id ? "active" : ""}`} onClick={() => actions.setSplit(s.id)}>
            {tr(s.name)}
          </button>
        ))}
      </div>
      <p className="footnote" style={{ marginInline: 4 }}>
        {tr(SPLITS.find((s) => s.id === split)!.blurb)}
        {split === "auto" && " " + tr("Using {name}.", { name: tr(SPLITS.find((s) => s.id === plan.split)!.name) })}
      </p>

      <div className="group" style={{ marginTop: 14 }}>
        <div className="row">
          <div className="row-main">{tr("Days per week")}</div>
          <Stepper value={profile.trainingDays} min={2} max={6} onChange={(v) => actions.updateProfile({ trainingDays: v })} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, padding: 10 }}>
        <div className="week">
          {WEEKDAYS.map((w, i) => {
            const d = plan.days.find((x) => x.weekday === i);
            return (
              <div key={w} className={`weekday ${i === today ? "today" : ""}`}>
                {tr(w)}
                <span className={`mark ${d ? "train" : ""}`}>{d ? dayMark(d.title) : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {plan.days.map((d) => {
        const isOpen = open === d.key;
        return (
          <motion.div layout transition={SPRING} key={d.key} className="card" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
            <button
              className="row"
              style={{ background: "transparent", padding: "14px 16px" }}
              onClick={() => setOpen(isOpen ? null : d.key)}
              aria-expanded={isOpen}
            >
              <div className="row-main">
                <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                  {tr(WEEKDAYS[d.weekday]).toUpperCase()}
                  {d.weekday === today && ` · ${tr("Today").toUpperCase()}`}
                </div>
                <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>{d.title}</div>
                <div className="row-sub">
                  {d.focus} · ~{d.estMinutes} min
                </div>
              </div>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={SPRING} style={{ display: "grid", color: "var(--label-3)" }}>
                <ChevronDown size={20} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ padding: "0 16px 16px" }}>
                    {d.exercises.map((e, i) => (
                      <div key={e.name} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: "0.5px solid var(--separator)" }}>
                        <span className="muted tabular" style={{ width: 18, fontWeight: 600 }}>
                          {i + 1}
                        </span>
                        <div className="row-main">
                          <div style={{ fontWeight: 600 }}>{e.name}</div>
                          <div className="row-sub" style={{ whiteSpace: "normal" }}>
                            {tr("{sets} sets × {reps} reps · rest {rest} · RIR {rir}", {
                              sets: e.sets,
                              reps: e.reps,
                              rest: e.restSec >= 120 ? `${e.restSec / 60} min` : `${e.restSec}s`,
                              rir: e.rir,
                            })}
                          </div>
                          {e.tip && (
                            <div className="row-sub" style={{ whiteSpace: "normal", marginTop: 2, fontStyle: "italic" }}>
                              {tr(e.tip)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {d.cardio && (
                      <div className="row-sub" style={{ whiteSpace: "normal", padding: "10px 0", borderTop: "0.5px solid var(--separator)" }}>
                        + {d.cardio}
                      </div>
                    )}
                    <button className="btn" style={{ marginTop: 6 }} onClick={() => start(d)}>
                      <LogIn size={18} /> {tr("Clock in & start")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      <div className="section-header">{tr("How to progress")}</div>
      <div className="card">
        {plan.principles.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginTop: i ? 12 : 0, fontSize: 15 }}>
            <Lightbulb size={16} color="var(--yellow)" style={{ flex: "none", marginTop: 2 }} />
            <span>{p}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function NutritionPlan() {
  const profile = useStore((s) => s.profile);
  const t = targets(profile);
  const [food, setFood] = useState<Food | null>(null);
  const groups = recommendedFoods(profile.goal, profile.diet, profile.allergies, profile.dislikes);
  const day = useMemo(
    () => sampleDay(t, profile.diet, { allergies: profile.allergies, dislikes: profile.dislikes, fasting: profile.fasting }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t.kcal, t.protein, profile.diet, profile.allergies, profile.dislikes, profile.fasting],
  );
  const byName = useMemo(() => new Map(FOODS.map((f) => [f.name, f])), []);
  const pct = (g: number, k: number) => Math.round(((g * k) / t.kcal) * 100);

  const goalText = {
    lose: profile.fasting === "ramadan" ? tr("a 15% deficit (gentler during Ramadan)") : tr("a 20% deficit to lose ~0.5 kg/week"),
    maintain: tr("maintenance"),
    gain: tr("a 10% surplus for lean gains"),
  }[profile.goal];

  const logMeal = (m: (typeof day.meals)[number]) => {
    const name = m.name.toLowerCase();
    const meal: MealType =
      name.includes("breakfast") || name.includes("sahur")
        ? "breakfast"
        : name.includes("lunch") || name.includes("first meal")
          ? "lunch"
          : name.includes("dinner") || name.includes("iftar") || name.includes("last meal")
            ? "dinner"
            : "snack";
    actions.addLog(m.items.map((i) => ({ date: todayKey(), meal, name: i.food.name, grams: i.grams, nutrients: i.nutrients, source: "db" as const })));
    haptic();
    showToast(tr("Logged {name} · {kcal} kcal", { name: tr(m.name), kcal: round(m.total.kcal) }));
  };

  return (
    <>
      <div className="section-header">{tr("Your daily targets")}</div>
      <div className="card">
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="big-number">{t.kcal.toLocaleString()}</span>
          <span className="muted">{tr("kcal / day")}</span>
        </div>
        <p className="row-sub" style={{ whiteSpace: "normal", marginTop: 6 }}>
          {tr("Resting burn {bmr} kcal × activity {activity} = {tdee} kcal maintenance, adjusted for {goal}.", {
            bmr: round(bmr(profile)),
            activity: profile.activity,
            tdee: round(tdee(profile)),
            goal: goalText,
          })}
        </p>
        <div className="spacer" />
        <div className="macro-row">
          {[
            ["Protein", t.protein, 4, "var(--protein)"],
            ["Carbs", t.carbs, 4, "var(--carbs)"],
            ["Fat", t.fat, 9, "var(--fat)"],
          ].map(([k, g, kc, c]) => (
            <div className="stat" key={k as string}>
              <span className="stat-label">
                <span className="dot" style={{ background: c as string }} />
                {tr(k as string)}
              </span>
              <span className="stat-value">
                {g as number}
                <small>g</small>
              </span>
              <span className="row-sub">{tr("{pct}% of calories", { pct: pct(g as number, kc as number) })}</span>
            </div>
          ))}
        </div>
        <p className="row-sub" style={{ whiteSpace: "normal", marginTop: 12 }}>
          {tr("Fibre ≥ {fiber} g · Sugar ≤ {sugar} g · Sodium ≤ 2,000 mg · Water ~{water} L", {
            fiber: t.fiber,
            sugar: t.sugarMax,
            water: round((profile.weightKg * 35) / 1000, 1),
          })}
        </p>
      </div>

      <div className="section-header">{tr("What to eat")}</div>
      {groups.filter((g) => g.foods.length > 0).map((g) => (
        <div className="card" key={g.title} style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, color: g.title === "Limit" ? "var(--red)" : undefined }}>{tr(g.title)}</div>
          <div className="row-sub" style={{ whiteSpace: "normal" }}>
            {tr(g.why)}
          </div>
          <div className="pill-list">
            {g.foods.map((n) => (
              <button key={n} className="chip pressable" style={{ background: "var(--bg-fill)", height: 30, fontSize: 14 }} onClick={() => setFood(byName.get(n) ?? null)}>
                {n.replace(/ \(.*\)$/, "")}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="section-header">
        {tr("Sample day · {kcal} kcal · P {protein} g", { kcal: round(day.total.kcal), protein: round(day.total.protein) })}
      </div>
      {(profile.dislikes?.length ?? 0) > 0 && (
        <p className="footnote" style={{ margin: "4px 0 0" }} data-testid="plan-without">
          {tr("Planned without {foods}.", { foods: profile.dislikes!.map((d) => dislikeLabel(d).toLowerCase()).join(", ") })}
          {profile.dislikes!.includes("vegetables") ? ` ${tr("Fruit takes the place of vegetables for fibre and vitamins.")}` : ""}
        </p>
      )}
      {day.meals.map((m) => (
        <div className="card" key={m.name} style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="row-main">
              <div className="muted" style={{ fontSize: 13 }}>
                {tr(m.time)}
              </div>
              <div style={{ fontWeight: 700 }}>{tr(m.name)}</div>
            </div>
            <span className="row-value">{round(m.total.kcal)} kcal</span>
            <button className="btn small tinted" onClick={() => logMeal(m)} aria-label={tr("Log {name}", { name: tr(m.name) })}>
              <Plus size={15} /> {tr("Log")}
            </button>
          </div>
          <div style={{ marginTop: 8 }}>
            {m.items.map((i) => (
              <div key={i.food.name} className="row-sub" style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>
                  {i.food.name} · {i.grams} g
                </span>
                <span className="tabular">{round(i.nutrients.kcal)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="section-header">{tr("Timing & tips")}</div>
      <div className="group">
        {mealTiming(profile.goal, profile.fasting).map((x) => (
          <div className="row" key={x.title} style={{ alignItems: "flex-start" }}>
            <div className="row-main">
              <div style={{ fontWeight: 600 }}>{x.title}</div>
              <div className="row-sub" style={{ whiteSpace: "normal" }}>
                {x.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="footnote">
        {tr("General guidance, not medical advice. If you have a medical condition, are pregnant, or under 18, check with a doctor or dietitian.")}
      </p>

      <FoodSheet food={food} onClose={() => setFood(null)} />
    </>
  );
}
