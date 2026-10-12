import { useMemo, useState } from "react";
import {
  ChevronRight,
  RefreshCw,
  Settings2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { t, useLanguage } from "../i18n";
import { mealLabel } from "../lib/api";
import {
  CUISINES,
  IDEA_STYLES,
  IDEA_VARIETY,
  mealBudgets,
  mealIdeas,
  prefsSummary,
  type IdeaContext,
} from "../lib/ideas";
import { round, targets } from "../lib/nutrition";
import { actions, DEFAULT_MEAL_PREFS, useStore } from "../lib/store";
import type { MealType } from "../lib/types";
import { Segmented, Sheet, Switch, haptic, showToast } from "./ui";

/**
 * Today's meal ideas: one suggestion for the next meal (others a tap away), sized to what's
 * left of the day, with "Log it", "Another idea", like and "never again". Likes, swaps and
 * what the person logs change what comes up next.
 */
export function MealIdeasCard({
  today,
  meals,
  burned,
  now,
}: {
  today: string;
  meals: MealType[];
  burned: number;
  now: number;
}) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const log = useStore((s) => s.log);
  const prefs = useStore((s) => s.mealPrefs);
  const [settings, setSettings] = useState(false);
  const [picked, setPicked] = useState<MealType | null>(null);
  // Dishes already shown and swapped away this visit, per meal.
  const [shown, setShown] = useState<Partial<Record<MealType, string[]>>>({});

  const d = new Date(now);
  const minutes = d.getHours() * 60 + d.getMinutes();
  // Workouts tick every second; round so the ideas don't reshuffle while training.
  const burnedStep = Math.round(burned / 50) * 50;
  const ctx: IdeaContext = useMemo(
    () => ({
      profile,
      targets: targets(profile),
      log,
      today,
      burned: burnedStep,
      prefs,
      minutes: Math.floor(minutes / 30) * 30,
    }),
    [profile, log, today, burnedStep, prefs, Math.floor(minutes / 30)],
  );
  const budgets = useMemo(() => mealBudgets(ctx, meals), [ctx, meals.join()]);
  const current = budgets.find((b) => b.meal === picked) ?? budgets[0];
  const exclude = current ? (shown[current.meal] ?? []) : [];
  const idea = useMemo(
    () =>
      current
        ? mealIdeas(
            ctx,
            current.meal,
            { kcal: Math.max(current.kcal, 120), protein: current.protein },
            exclude,
          )[0]
        : undefined,
    [ctx, current?.meal, Math.round(current?.kcal ?? 0), exclude.join("|")],
  );

  const settingsSheet = (
    <MealIdeasSheet open={settings} onClose={() => setSettings(false)} />
  );
  // Turned off from its own settings: keep the sheet open until it's closed.
  if (!prefs.on) return settingsSheet;

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div className="icon-tile" style={{ background: "var(--orange)" }}>
        <Sparkles size={18} />
      </div>
      <div className="row-main">
        <div className="tile-title">{t("Meal ideas for today")}</div>
        <div className="tile-sub">
          {prefsSummary(prefs) || t("Picked for your goal, diet and taste")}
        </div>
      </div>
      <button
        className="icon-btn"
        onClick={() => setSettings(true)}
        aria-label={t("Meal idea settings")}
      >
        <Settings2 size={18} />
      </button>
    </div>
  );

  const another = () => {
    if (!current || !idea) return;
    actions.skipIdea(idea.key);
    setShown((s) => ({
      ...s,
      [current.meal]: [...(s[current.meal] ?? []), idea.key].slice(-40),
    }));
    haptic();
  };

  return (
    <div
      className="card idea-card"
      style={{ marginTop: 12 }}
      data-testid="meal-ideas"
    >
      {settingsSheet}
      {header}
      {!current ? (
        <p className="tile-sub" style={{ margin: "10px 0 0" }}>
          {t("Every meal is logged for today. New ideas tomorrow.")}
        </p>
      ) : (
        <>
          {budgets.length > 1 && (
            <div
              className="chips"
              style={{ marginTop: 12 }}
              role="tablist"
              aria-label={t("Meal")}
            >
              {budgets.map((b) => (
                <button
                  key={b.meal}
                  role="tab"
                  aria-selected={b.meal === current.meal}
                  className={`chip${b.meal === current.meal ? " active" : ""}`}
                  onClick={() => setPicked(b.meal)}
                >
                  {mealLabel(b.meal)}
                </button>
              ))}
            </div>
          )}
          {current.kcal < 120 && (
            <p className="tile-sub" style={{ margin: "10px 0 0" }}>
              {t(
                "You've reached today's calories. If you're still hungry, something light:",
              )}
            </p>
          )}
          {!idea ? (
            <p className="tile-sub" style={{ margin: "10px 0 0" }}>
              {t("No more ideas match your settings for this meal.")}{" "}
              <button
                className="link"
                onClick={() => setShown((s) => ({ ...s, [current.meal]: [] }))}
              >
                {t("Start over")}
              </button>
            </p>
          ) : (
            <>
              <div className="idea-title" data-testid="idea-title">
                {idea.key}
              </div>
              {idea.items.length === 1 ? (
                <div className="idea-grams muted tabular">
                  {t("{g} g", { g: idea.items[0].grams })}
                </div>
              ) : (
                <div className="idea-items">
                  {idea.items.map((it, i) => (
                    <div key={`${it.food.id}-${i}`} className="idea-item">
                      <span className="row-main">
                        {it.food.name}{" "}
                        <span className="muted">· {it.grams} g</span>
                      </span>
                      <span className="muted tabular">
                        {round(it.nutrients.kcal)} kcal
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="idea-total tabular" data-testid="idea-macros">
                {t("{kcal} kcal · {p} g protein · {c} g carbs · {f} g fat", {
                  kcal: round(idea.total.kcal),
                  p: round(idea.total.protein),
                  c: round(idea.total.carbs),
                  f: round(idea.total.fat),
                })}
              </div>
              {idea.reasons.map((r) => (
                <div key={r} className="idea-reason">
                  {r}
                </div>
              ))}
              <div className="idea-actions">
                <button
                  className="btn small green"
                  onClick={() => {
                    const ids = actions.addLog(
                      idea.items.map((it) => ({
                        date: today,
                        meal: current.meal,
                        name: it.food.name,
                        grams: it.grams,
                        nutrients: it.nutrients,
                        source: it.food.source,
                      })),
                    );
                    haptic("success");
                    showToast(
                      t("Logged to {meal} · {kcal} kcal", {
                        meal: mealLabel(current.meal),
                        kcal: round(idea.total.kcal),
                      }),
                      {
                        label: t("Undo"),
                        run: () => actions.removeLogs(ids),
                      },
                    );
                  }}
                >
                  {t("Log it")}
                </button>
                <button className="btn small secondary" onClick={another}>
                  <RefreshCw size={15} style={{ verticalAlign: -2 }} />{" "}
                  {t("Another idea")}
                </button>
                <span style={{ flex: 1 }} />
                <button
                  className={`icon-btn${prefs.liked.includes(idea.key) ? " on" : ""}`}
                  aria-label={t("I like this")}
                  aria-pressed={prefs.liked.includes(idea.key)}
                  onClick={() => {
                    const liked = !prefs.liked.includes(idea.key);
                    actions.toggleLikedIdea(idea.key);
                    haptic();
                    if (liked)
                      showToast(
                        t("Got it · you'll see {name} more often", {
                          name: short(idea.key),
                        }),
                      );
                  }}
                >
                  <ThumbsUp size={18} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={t("Don't suggest this again")}
                  onClick={() => {
                    const key = idea.key;
                    actions.hideIdea(key);
                    haptic();
                    showToast(
                      t("Won't suggest {name} again", { name: short(key) }),
                      { label: t("Undo"), run: () => actions.unhideIdea(key) },
                    );
                  }}
                >
                  <ThumbsDown size={18} />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const short = (name: string) =>
  name.length > 26 ? name.slice(0, 26) + "…" : name;

/** Everything the meal ideas take into account, and what they've learned. */
export function MealIdeasSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useLanguage();
  const prefs = useStore((s) => s.mealPrefs);
  const profile = useStore((s) => s.profile);
  const spicy = (profile.dislikes ?? []).includes("spicy");
  const toggleCuisine = (c: string) =>
    actions.setMealPrefs({
      cuisines: prefs.cuisines.includes(c)
        ? prefs.cuisines.filter((x) => x !== c)
        : [...prefs.cuisines, c],
    });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("Meal ideas")}
      right={<button onClick={onClose}>{t("Done")}</button>}
    >
      <div className="group">
        <div className="field">
          <label>{t("Show meal ideas on Today")}</label>
          <Switch
            checked={prefs.on}
            onChange={(on) => actions.setMealPrefs({ on })}
            label={t("Show meal ideas on Today")}
          />
        </div>
      </div>

      <div className="section-header">{t("Style")}</div>
      <div className="group" role="radiogroup" aria-label={t("Style")}>
        {IDEA_STYLES.map((s) => (
          <button
            key={s.value}
            className="row"
            role="radio"
            aria-checked={prefs.style === s.value}
            onClick={() => actions.setMealPrefs({ style: s.value })}
          >
            <span className="row-main">
              <span className="row-title">{t(s.label)}</span>
              <span className="row-sub" style={{ display: "block" }}>
                {t(s.sub)}
              </span>
            </span>
            {prefs.style === s.value && (
              <span className="check-mark" aria-hidden>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="section-header">{t("Cuisines")}</div>
      <div className="chip-wrap" role="group" aria-label={t("Cuisines")}>
        <button
          className={`chip${prefs.cuisines.length === 0 ? " active" : ""}`}
          aria-pressed={prefs.cuisines.length === 0}
          onClick={() => actions.setMealPrefs({ cuisines: [] })}
        >
          {t("Any")}
        </button>
        {CUISINES.map((c) => (
          <button
            key={c.value}
            className={`chip${prefs.cuisines.includes(c.value) ? " active" : ""}`}
            aria-pressed={prefs.cuisines.includes(c.value)}
            onClick={() => toggleCuisine(c.value)}
          >
            {t(c.label)}
          </button>
        ))}
      </div>

      <div className="section-header">{t("Variety")}</div>
      <Segmented
        ariaLabel={t("Variety")}
        value={prefs.variety}
        onChange={(variety) => actions.setMealPrefs({ variety })}
        options={IDEA_VARIETY.map((v) => ({
          value: v.value,
          label: t(v.label),
        }))}
      />

      <div className="group" style={{ marginTop: 16 }}>
        <div className="field">
          <label>{t("No spicy food")}</label>
          <Switch
            checked={spicy}
            onChange={(on) =>
              actions.updateProfile({
                dislikes: on
                  ? [...(profile.dislikes ?? []), "spicy"]
                  : (profile.dislikes ?? []).filter((d) => d !== "spicy"),
              })
            }
            label={t("No spicy food")}
          />
        </div>
      </div>
      <p className="footnote">
        {t(
          "Ideas always leave out your allergies, your diet (halal, vegetarian, vegan) and foods you don't eat, set in Profile. They're sized to the calories and protein you have left today.",
        )}
      </p>

      {prefs.liked.length > 0 && (
        <>
          <div className="section-header">{t("Dishes you like")}</div>
          <div className="group">
            {prefs.liked.map((n) => (
              <div className="row" key={n}>
                <ThumbsUp size={15} color="var(--green)" />
                <span className="row-main row-title">{n}</span>
                <button
                  className="icon-btn"
                  aria-label={t("Remove {name}", { name: n })}
                  onClick={() => actions.toggleLikedIdea(n)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {prefs.hidden.length > 0 && (
        <>
          <div className="section-header">{t("Not suggested")}</div>
          <div className="group">
            {prefs.hidden.map((n) => (
              <div className="row" key={n}>
                <ThumbsDown size={15} color="var(--red)" />
                <span className="row-main row-title">{n}</span>
                <button className="link" onClick={() => actions.unhideIdea(n)}>
                  {t("Restore")}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {(prefs.liked.length > 0 ||
        prefs.hidden.length > 0 ||
        prefs.skipped.length > 0) && (
        <button
          className="btn secondary"
          style={{ marginTop: 16, width: "100%" }}
          onClick={() => {
            const before = prefs;
            actions.setMealPrefs({ liked: [], hidden: [], skipped: [] });
            showToast(t("Meal ideas start fresh"), {
              label: t("Undo"),
              run: () =>
                actions.setMealPrefs({
                  liked: before.liked,
                  hidden: before.hidden,
                  skipped: before.skipped,
                }),
            });
          }}
        >
          {t("Forget likes and swaps")}
        </button>
      )}
    </Sheet>
  );
}

/** A row in Profile that opens the meal idea settings. */
export function MealIdeasRow() {
  useLanguage();
  const prefs = useStore((s) => s.mealPrefs) ?? DEFAULT_MEAL_PREFS;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="row with-icon" onClick={() => setOpen(true)}>
        <div className="icon-tile" style={{ background: "var(--orange)" }}>
          <Sparkles size={17} />
        </div>
        <div className="row-main">
          <div className="row-title">{t("Meal ideas")}</div>
          <div className="row-sub">
            {prefs.on
              ? prefsSummary(prefs) || t("Picked for your goal, diet and taste")
              : t("Off")}
          </div>
        </div>
        <ChevronRight size={16} className="chev" />
      </button>
      <MealIdeasSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
