import { useState } from "react";
import { AccountCard } from "../components/Account";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Bell, ChevronRight, Dumbbell, FileDown, FileText, Flame, Languages, Leaf, LineChart, Moon, MoonStar, Scale, Sun, SunMoon, Target, TrendingDown, TrendingUp, User } from "lucide-react";
import { Segmented, SPRING, Stepper, Switch, showToast } from "../components/ui";
import { LANGUAGES, t, useLanguage } from "../i18n";
import { ALLERGENS } from "../lib/allergens";
import { toCsv, toPdf } from "../lib/export";
import { shareFile } from "../lib/native";
import { isNative } from "../lib/platform";
import { getState, todayKey } from "../lib/store";
import type { SheetKind } from "../App";
import { bmi, bmiLabel, bmr, round, targets, tdee } from "../lib/nutrition";
import { getAccount, syncNow, useAccount } from "../lib/account";
import { confirmDialog } from "../lib/platform";
import { actions, useStore } from "../lib/store";
import type { Profile as P } from "../lib/types";

const ACTIVITY: { value: P["activity"]; label: string; sub: string }[] = [
  { value: 1.2, label: "Sedentary", sub: "Desk job, little exercise" },
  { value: 1.375, label: "Lightly active", sub: "Exercise 1–3 days a week" },
  { value: 1.55, label: "Moderately active", sub: "Exercise 3–5 days a week" },
  { value: 1.725, label: "Very active", sub: "Hard training 6–7 days a week" },
  { value: 1.9, label: "Athlete", sub: "Twice a day or a physical job" },
];

const GOALS: { value: P["goal"]; label: string; sub: string; icon: typeof Target; color: string }[] = [
  { value: "lose", label: "Lose fat", sub: "Calorie deficit, keep muscle", icon: TrendingDown, color: "var(--orange)" },
  { value: "maintain", label: "Maintain & tone", sub: "Stay at your weight, recompose", icon: Target, color: "var(--blue)" },
  { value: "gain", label: "Build muscle", sub: "Small calorie surplus", icon: TrendingUp, color: "var(--green)" },
];

const DIETS: { value: P["diet"]; label: string }[] = [
  { value: "anything", label: "Anything" },
  { value: "halal", label: "Halal" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
];

function NumField({ label, value, unit, onChange, step = 1 }: { label: string; value: number; unit: string; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="field" data-tour={`field-${label.toLowerCase()}`}>
      <label>{t(label)}</label>
      <input
        inputMode="decimal"
        value={value || ""}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value.replace(",", ".")) || 0)}
        aria-label={t(label)}
      />
      <span className="muted" style={{ width: 28 }}>
        {t(unit)}
      </span>
    </div>
  );
}

function ProfileFields({ p, set }: { p: P; set: (x: Partial<P>) => void }) {
  return (
    <>
      <div className="group">
        <div className="field">
          <label htmlFor="pf-name">{t("Name")}</label>
          <input id="pf-name" value={p.name} placeholder={t("Optional")} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="field">
          <label>{t("Sex")}</label>
          <div style={{ width: 170 }}>
            <Segmented
              value={p.sex}
              onChange={(v) => set({ sex: v })}
              options={[
                { value: "male", label: t("Male") },
                { value: "female", label: t("Female") },
              ]}
            />
          </div>
        </div>
        <NumField label="Age" value={p.age} unit="yrs" onChange={(v) => set({ age: v })} />
        <NumField label="Height" value={p.heightCm} unit="cm" onChange={(v) => set({ heightCm: v })} />
        <NumField label="Weight" value={p.weightKg} unit="kg" step={0.1} onChange={(v) => set({ weightKg: v })} />
      </div>
    </>
  );
}

function OptionList<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; sub?: string; icon?: typeof Target; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button key={String(o.value)} className={`option-card pressable ${o.value === value ? "selected" : ""}`} onClick={() => onChange(o.value)} aria-pressed={o.value === value}>
            {Icon && (
              <div className="icon-tile" style={{ background: o.color }}>
                <Icon size={18} />
              </div>
            )}
            <div className="row-main">
              <div style={{ fontWeight: 600 }}>{t(o.label)}</div>
              {o.sub && <div className="row-sub">{t(o.sub)}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TimeField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="time" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} style={{ width: 110 }} />
    </div>
  );
}

function exportName(ext: string) {
  return `calories-${todayKey()}.${ext}`;
}

export function ProfileScreen({ openSheet }: { openSheet: (k: SheetKind) => void }) {
  useLanguage();
  const openBodyCheck = () => openSheet("bodyCheck");
  const p = useStore((s) => s.profile);
  const reminders = useStore((s) => s.reminders);
  const language = useStore((s) => s.language);
  const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);
  const doExport = async (kind: "csv" | "pdf") => {
    setExporting(kind);
    try {
      const s = getState();
      const blob = kind === "csv" ? new Blob(["\uFEFF" + toCsv(s)], { type: "text/csv;charset=utf-8" }) : await toPdf(s, todayKey());
      await shareFile(exportName(kind), blob, kind === "csv" ? t("W data (CSV)") : t("W 30-day report"));
    } catch (e) {
      if ((e as Error).name !== "AbortError") showToast(t("Couldn't export: {msg}", { msg: (e as Error).message }));
    } finally {
      setExporting(null);
    }
  };
  const tg = targets(p);
  const b = bmi(p);
  const signedIn = !!useAccount().token;
  const theme = useStore((s) => s.theme);
  return (
    <div className="screen">
      <div className="title-row" style={{ marginTop: 14, alignItems: "center" }}>
        <h1 className="large-title">{t("Profile")}</h1>
        <Segmented
          className="icon-seg"
          ariaLabel={t("Appearance")}
          value={theme}
          onChange={actions.setTheme}
          options={[
            { value: "system", label: <SunMoon size={18} />, ariaLabel: t("Match phone setting") },
            { value: "light", label: <Sun size={18} />, ariaLabel: t("Light") },
            { value: "dark", label: <Moon size={18} />, ariaLabel: t("Dark") },
          ]}
        />
      </div>
      <p className="subtitle">{t("Your numbers drive every target and plan in the app.")}</p>

      <AccountCard />
      <div className="spacer" />

      <div className="card">
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">
              <Scale size={13} /> BMI
            </span>
            <span className="stat-value">{round(b, 1)}</span>
            <span className="row-sub">{bmiLabel(b)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">
              <Flame size={13} /> {t("Resting")}
            </span>
            <span className="stat-value">
              {round(bmr(p))}
              <small>kcal</small>
            </span>
            <span className="row-sub">{t("BMR")}</span>
          </div>
          <div className="stat">
            <span className="stat-label">
              <Activity size={13} /> {t("Maintain")}
            </span>
            <span className="stat-value">
              {round(tdee(p))}
              <small>kcal</small>
            </span>
            <span className="row-sub">{t("Target {kcal}", { kcal: tg.kcal })}</span>
          </div>
        </div>
      </div>

      <div className="section-header">{t("About you")}</div>
      <ProfileFields p={p} set={actions.updateProfile} />

      <div className="group" style={{ marginTop: 12 }}>
        <button className="row with-icon" onClick={openBodyCheck}>
          <div className="icon-tile" style={{ background: "var(--teal)" }}>
            <Scale size={17} />
          </div>
          <div className="row-main">
            <div className="row-title">{t("Body check")}</div>
            <div className="row-sub">{t("BMI calculator with training and diet advice")}</div>
          </div>
          <ChevronRight size={16} className="chev" />
        </button>
        <button className="row with-icon" onClick={() => openSheet("progress")}>
          <div className="icon-tile" style={{ background: "var(--blue)" }}>
            <LineChart size={17} />
          </div>
          <div className="row-main">
            <div className="row-title">{t("Progress")}</div>
            <div className="row-sub">{t("Weight chart, steps, water and streaks")}</div>
          </div>
          <ChevronRight size={16} className="chev" />
        </button>
      </div>

      <div className="section-header">{t("Goal")}</div>
      <OptionList options={GOALS} value={p.goal} onChange={(goal) => actions.updateProfile({ goal })} />

      <div className="section-header">{t("Activity level")}</div>
      <OptionList options={ACTIVITY} value={p.activity} onChange={(activity) => actions.updateProfile({ activity })} />

      <div className="section-header">{t("Training")}</div>
      <div className="group">
        <div className="field">
          <label>{t("Experience")}</label>
          <div style={{ width: 230 }}>
            <Segmented
              value={p.experience}
              onChange={(experience) => actions.updateProfile({ experience })}
              options={[
                { value: "beginner", label: t("New") },
                { value: "intermediate", label: t("1–3 yrs") },
                { value: "advanced", label: t("3+ yrs") },
              ]}
            />
          </div>
        </div>
        <div className="field">
          <label>{t("Days per week")}</label>
          <Stepper value={p.trainingDays} min={2} max={6} onChange={(trainingDays) => actions.updateProfile({ trainingDays })} />
        </div>
      </div>

      <div className="section-header">{t("Diet")}</div>
      <div className="chips">
        {DIETS.map((d) => (
          <button key={d.value} className={`chip ${p.diet === d.value ? "active" : ""}`} aria-pressed={p.diet === d.value} onClick={() => actions.updateProfile({ diet: d.value })}>
            {t(d.label)}
          </button>
        ))}
      </div>

      <div className="section-header">{t("Allergies & foods to avoid")}</div>
      <div className="chips" role="group" aria-label={t("Allergies")}>
        {ALLERGENS.map((a) => {
          const on = p.allergies.includes(a.value);
          return (
            <button
              key={a.value}
              className={`chip ${on ? "active" : ""}`}
              aria-pressed={on}
              onClick={() => actions.updateProfile({ allergies: on ? p.allergies.filter((x) => x !== a.value) : [...p.allergies, a.value] })}
            >
              {t(a.label)}
            </button>
          );
        })}
      </div>
      <p className="footnote">
        {t("Foods that usually contain these{halal} are marked and left out of your meal plan. Recipes vary, so always check with the seller.", {
          halal: p.diet === "halal" ? t(", pork or alcohol") : "",
        })}
      </p>

      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MoonStar size={14} /> {t("Fasting")}
        </span>
      </div>
      <div className="group">
        <div className="field">
          <label>{t("Mode")}</label>
          <div style={{ width: 230 }}>
            <Segmented
              ariaLabel={t("Fasting")}
              value={p.fasting}
              onChange={(fasting) => actions.updateProfile({ fasting })}
              options={[
                { value: "off", label: t("Off") },
                { value: "ramadan", label: t("Ramadan") },
                { value: "16:8", label: "16:8" },
              ]}
            />
          </div>
        </div>
        {p.fasting === "ramadan" && (
          <>
            <TimeField id="pf-sahur" label={t("Sahur ends (imsak)")} value={p.fastTimes.sahur} onChange={(sahur) => actions.updateProfile({ fastTimes: { ...p.fastTimes, sahur } })} />
            <TimeField id="pf-iftar" label={t("Iftar (maghrib)")} value={p.fastTimes.iftar} onChange={(iftar) => actions.updateProfile({ fastTimes: { ...p.fastTimes, iftar } })} />
          </>
        )}
        {p.fasting === "16:8" && (
          <TimeField id="pf-window" label={t("Eating window starts")} value={p.fastTimes.windowStart} onChange={(windowStart) => actions.updateProfile({ fastTimes: { ...p.fastTimes, windowStart } })} />
        )}
      </div>
      {p.fasting !== "off" && (
        <p className="footnote">
          {p.fasting === "ramadan"
            ? t("Meals become Sahur, Iftar and Moreh. Set the times for your area — they change through the month.")
            : t("You eat for 8 hours and fast for 16. Today shows when your window opens and closes.")}
        </p>
      )}

      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Bell size={14} /> {t("Reminders")}
        </span>
      </div>
      <div className="group">
        <div className="field">
          <label>{p.fasting === "ramadan" ? t("Sahur and iftar") : t("Meals")}</label>
          <Switch checked={reminders.meals} onChange={(meals) => actions.setReminders({ meals })} label={t("Meal reminders")} />
        </div>
        {reminders.meals && p.fasting !== "ramadan" && (
          <>
            <TimeField id="rm-b" label={t("Breakfast")} value={reminders.breakfast} onChange={(breakfast) => actions.setReminders({ breakfast })} />
            <TimeField id="rm-l" label={t("Lunch")} value={reminders.lunch} onChange={(lunch) => actions.setReminders({ lunch })} />
            <TimeField id="rm-d" label={t("Dinner")} value={reminders.dinner} onChange={(dinner) => actions.setReminders({ dinner })} />
          </>
        )}
        <div className="field">
          <label>{t("Drink water")}</label>
          <Switch checked={reminders.water} onChange={(water) => actions.setReminders({ water })} label={t("Water reminders")} />
        </div>
        <div className="field">
          <label>{t("Gym days")}</label>
          <Switch checked={reminders.gym} onChange={(gym) => actions.setReminders({ gym })} label={t("Gym reminders")} />
        </div>
        {reminders.gym && <TimeField id="rm-g" label={t("Gym time")} value={reminders.gymTime} onChange={(gymTime) => actions.setReminders({ gymTime })} />}
      </div>
      <p className="footnote">
        {isNative
          ? t("Gym reminders and a running workout show Clock in / Clock out buttons — on your Apple Watch or Wear OS watch too.")
          : t("Reminders work in the iPhone and Android apps. In a browser they can't be scheduled.")}
      </p>

      <div className="section-header">{t("Daily goals")}</div>
      <div className="group">
        <div className="field">
          <label>{t("Steps")}</label>
          <Stepper value={p.stepGoal} step={1000} min={2000} max={30000} format={(v) => v.toLocaleString()} label={t("step goal")} onChange={(stepGoal) => actions.updateProfile({ stepGoal })} />
        </div>
      </div>

      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Languages size={14} /> {t("Language")}
        </span>
      </div>
      <div className="group">
        {LANGUAGES.map((l) => (
          <button key={l.value} className="row" onClick={() => actions.setLanguage(l.value)} aria-pressed={language === l.value} lang={l.locale}>
            <span className="row-main row-title">{l.label}</span>
            {language === l.value && <span className="check-mark" aria-hidden>✓</span>}
          </button>
        ))}
      </div>

      <div className="section-header">{t("Data")}</div>
      <div className="group">
        <button className="row with-icon" onClick={() => doExport("csv")} disabled={!!exporting}>
          <div className="icon-tile" style={{ background: "var(--green)" }}>
            {exporting === "csv" ? <div className="spinner" style={{ borderTopColor: "#fff" }} /> : <FileDown size={17} />}
          </div>
          <div className="row-main">
            <div className="row-title">{t("Export data (CSV)")}</div>
            <div className="row-sub">{t("Food log, workouts, weight, water and steps")}</div>
          </div>
        </button>
        <button className="row with-icon" onClick={() => doExport("pdf")} disabled={!!exporting}>
          <div className="icon-tile" style={{ background: "var(--red)" }}>
            {exporting === "pdf" ? <div className="spinner" style={{ borderTopColor: "#fff" }} /> : <FileText size={17} />}
          </div>
          <div className="row-main">
            <div className="row-title">{t("30-day report (PDF)")}</div>
            <div className="row-sub">{t("To share with a coach, trainer or doctor")}</div>
          </div>
        </button>
      </div>
      <div className="group" style={{ marginTop: 12 }}>
        <button
          className="row"
          style={{ color: "var(--red)" }}
          onClick={async () => {
            const signedIn = !!getAccount().token;
            const msg = signedIn
              ? t("Your logs, workouts, custom foods and profile on this phone and in your account will be erased. This can't be undone.")
              : t("Your logs, workouts, custom foods and profile on this phone will be erased. This can't be undone.");
            if (await confirmDialog(t("Delete all data?"), msg)) {
              actions.resetAll();
              if (signedIn) syncNow();
              showToast(t("All data deleted"));
            }
          }}
        >
          {t("Delete all data")}
        </button>
      </div>
      <p className="footnote">
        {signedIn
          ? t("Your data is stored on this phone and backed up to your account. Photos are sent to the server only for analysis and are not kept.")
          : t("Everything is stored only on this phone. Photos are sent to the server only for analysis and are not kept.")}
      </p>
    </div>
  );
}

// ── Onboarding ─────────────────────────────────────────

export function Onboarding() {
  useLanguage();
  const stored = useStore((s) => s.profile);
  // Signed in with Google/Apple/email? Start with the account's first name.
  const [p, setP] = useState<P>(() => ({ ...stored, name: stored.name || getAccount().user?.name?.split(" ")[0] || "" }));
  const [step, setStep] = useState(0);
  const set = (x: Partial<P>) => setP((o) => ({ ...o, ...x }));
  const valid = p.age >= 13 && p.age <= 100 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 300;

  const steps = [
    {
      title: "W",
      sub: t("Snap or search your food, track your training, and get a plan that fits your body."),
      body: (
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { Icon: Flame, color: "var(--orange)", t: "Count calories", s: "Photo recognition and 700+ foods from around the world" },
            { Icon: Dumbbell, color: "var(--green)", t: "Clock in at the gym", s: "Live timer and calories for 230+ exercises and sports" },
            { Icon: Target, color: "var(--blue)", t: "Get a plan", s: "Chest, back, arms, legs splits and a matching meal plan" },
            { Icon: Leaf, color: "var(--teal)", t: "Eat smarter", s: "See if a meal is healthy and right for your goal" },
          ].map(({ Icon, color, t: title, s }) => (
            <div key={title} className="option-card" style={{ boxShadow: "none" }}>
              <div className="icon-tile" style={{ background: color }}>
                <Icon size={18} />
              </div>
              <div className="row-main">
                <div style={{ fontWeight: 600 }}>{t(title)}</div>
                <div className="row-sub" style={{ whiteSpace: "normal" }}>
                  {t(s)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
      ok: true,
    },
    { title: t("About you"), sub: t("Used to calculate how many calories your body needs."), body: <ProfileFields p={p} set={set} />, ok: valid },
    { title: t("Your goal"), sub: t("You can change this any time."), body: <OptionList options={GOALS} value={p.goal} onChange={(goal) => set({ goal })} />, ok: true },
    { title: t("How active are you?"), sub: t("Outside of the workouts you'll log here."), body: <OptionList options={ACTIVITY} value={p.activity} onChange={(activity) => set({ activity })} />, ok: true },
    {
      title: t("Training"),
      sub: t("So we can build the right split for you."),
      body: (
        <>
          <OptionList
            options={[
              { value: "beginner", label: "New to the gym", sub: "Less than a year of consistent training", icon: User, color: "var(--teal)" },
              { value: "intermediate", label: "Intermediate", sub: "1–3 years", icon: Dumbbell, color: "var(--blue)" },
              { value: "advanced", label: "Advanced", sub: "3+ years, know your lifts", icon: Flame, color: "var(--pink)" },
            ]}
            value={p.experience}
            onChange={(experience) => set({ experience: experience as P["experience"] })}
          />
          <div className="group" style={{ marginTop: 14 }}>
            <div className="field">
              <label>{t("Days per week")}</label>
              <Stepper value={p.trainingDays} min={2} max={6} onChange={(trainingDays) => set({ trainingDays })} />
            </div>
          </div>
          <div className="section-header">{t("Diet")}</div>
          <div className="chips">
            {DIETS.map((d) => (
              <button key={d.value} className={`chip ${p.diet === d.value ? "active" : ""}`} onClick={() => set({ diet: d.value })}>
                {t(d.label)}
              </button>
            ))}
          </div>
        </>
      ),
      ok: true,
    },
  ];
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="onboard">
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {steps.map((_, i) => (
          <div key={i} className="bar" style={{ flex: 1, height: 4 }}>
            <motion.div style={{ background: "var(--blue)" }} animate={{ scaleX: i <= step ? 1 : 0 }} transition={SPRING} />
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={SPRING}
          style={{ flex: 1 }}
        >
          <h1 className="large-title">{s.title}</h1>
          <p className="subtitle">{s.sub}</p>
          {s.body}
        </motion.div>
      </AnimatePresence>
      <div className="btn-row" style={{ marginTop: 24 }}>
        {step > 0 && (
          <button className="btn secondary" style={{ width: 110, flex: "none" }} onClick={() => setStep(step - 1)}>
            {t("Back")}
          </button>
        )}
        <button
          className="btn"
          disabled={!s.ok}
          onClick={() => {
            if (last) actions.updateProfile({ ...p, onboarded: true });
            else setStep(step + 1);
          }}
        >
          {step === 0 ? t("Get started") : last ? t("Build my plan") : t("Continue")}
        </button>
      </div>
    </div>
  );
}
