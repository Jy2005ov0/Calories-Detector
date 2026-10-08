import { useState } from "react";
import { AccountCard } from "../components/Account";
import { AnimatePresence, motion } from "motion/react";
import { Activity, ChevronRight, Dumbbell, Flame, Leaf, Scale, Target, TrendingDown, TrendingUp, User } from "lucide-react";
import { Segmented, SPRING, Stepper, showToast } from "../components/ui";
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
      <label>{label}</label>
      <input
        inputMode="decimal"
        value={value || ""}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value.replace(",", ".")) || 0)}
        aria-label={label}
      />
      <span className="muted" style={{ width: 28 }}>
        {unit}
      </span>
    </div>
  );
}

function ProfileFields({ p, set }: { p: P; set: (x: Partial<P>) => void }) {
  return (
    <>
      <div className="group">
        <div className="field">
          <label htmlFor="pf-name">Name</label>
          <input id="pf-name" value={p.name} placeholder="Optional" onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="field">
          <label>Sex</label>
          <div style={{ width: 170 }}>
            <Segmented
              value={p.sex}
              onChange={(v) => set({ sex: v })}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
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
              <div style={{ fontWeight: 600 }}>{o.label}</div>
              {o.sub && <div className="row-sub">{o.sub}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ProfileScreen({ openBodyCheck }: { openBodyCheck: () => void }) {
  const p = useStore((s) => s.profile);
  const t = targets(p);
  const b = bmi(p);
  const signedIn = !!useAccount().token;
  return (
    <div className="screen">
      <h1 className="large-title" style={{ marginTop: 14 }}>
        Profile
      </h1>
      <p className="subtitle">Your numbers drive every target and plan in the app.</p>

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
              <Flame size={13} /> Resting
            </span>
            <span className="stat-value">
              {round(bmr(p))}
              <small>kcal</small>
            </span>
            <span className="row-sub">BMR</span>
          </div>
          <div className="stat">
            <span className="stat-label">
              <Activity size={13} /> Maintain
            </span>
            <span className="stat-value">
              {round(tdee(p))}
              <small>kcal</small>
            </span>
            <span className="row-sub">Target {t.kcal}</span>
          </div>
        </div>
      </div>

      <div className="section-header">About you</div>
      <ProfileFields p={p} set={actions.updateProfile} />

      <div className="group" style={{ marginTop: 12 }}>
        <button className="row with-icon" onClick={openBodyCheck}>
          <div className="icon-tile" style={{ background: "var(--teal)" }}>
            <Scale size={17} />
          </div>
          <div className="row-main">
            <div className="row-title">Body check</div>
            <div className="row-sub">BMI calculator with training and diet advice</div>
          </div>
          <ChevronRight size={16} className="chev" />
        </button>
      </div>

      <div className="section-header">Goal</div>
      <OptionList options={GOALS} value={p.goal} onChange={(goal) => actions.updateProfile({ goal })} />

      <div className="section-header">Activity level</div>
      <OptionList options={ACTIVITY} value={p.activity} onChange={(activity) => actions.updateProfile({ activity })} />

      <div className="section-header">Training</div>
      <div className="group">
        <div className="field">
          <label>Experience</label>
          <div style={{ width: 230 }}>
            <Segmented
              value={p.experience}
              onChange={(experience) => actions.updateProfile({ experience })}
              options={[
                { value: "beginner", label: "New" },
                { value: "intermediate", label: "1–3 yrs" },
                { value: "advanced", label: "3+ yrs" },
              ]}
            />
          </div>
        </div>
        <div className="field">
          <label>Days per week</label>
          <Stepper value={p.trainingDays} min={2} max={6} onChange={(trainingDays) => actions.updateProfile({ trainingDays })} />
        </div>
      </div>

      <div className="section-header">Diet</div>
      <div className="chips">
        {DIETS.map((d) => (
          <button key={d.value} className={`chip ${p.diet === d.value ? "active" : ""}`} onClick={() => actions.updateProfile({ diet: d.value })}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="section-header">Data</div>
      <div className="group">
        <button
          className="row"
          style={{ color: "var(--red)" }}
          onClick={async () => {
            const signedIn = !!getAccount().token;
            const where = signedIn ? "on this phone and in your account" : "on this phone";
            if (await confirmDialog("Delete all data?", `Your logs, workouts, custom foods and profile ${where} will be erased. This can't be undone.`)) {
              actions.resetAll();
              if (signedIn) syncNow();
              showToast("All data deleted");
            }
          }}
        >
          Delete all data
        </button>
      </div>
      <p className="footnote">
        {signedIn
          ? "Your data is stored on this phone and backed up to your account. Photos are sent to the server only for analysis and are not kept."
          : "Everything is stored only on this phone. Photos are sent to the server only for analysis and are not kept."}
      </p>
    </div>
  );
}

// ── Onboarding ─────────────────────────────────────────

export function Onboarding() {
  const stored = useStore((s) => s.profile);
  // Signed in with Google/Apple/email? Start with the account's first name.
  const [p, setP] = useState<P>(() => ({ ...stored, name: stored.name || getAccount().user?.name?.split(" ")[0] || "" }));
  const [step, setStep] = useState(0);
  const set = (x: Partial<P>) => setP((o) => ({ ...o, ...x }));
  const valid = p.age >= 13 && p.age <= 100 && p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 300;

  const steps = [
    {
      title: "Calories",
      sub: "Snap or search your food, track your training, and get a plan that fits your body.",
      body: (
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { Icon: Flame, color: "var(--orange)", t: "Count calories", s: "Photo recognition and 400+ foods including Malaysian favourites" },
            { Icon: Dumbbell, color: "var(--green)", t: "Clock in at the gym", s: "Live timer and calories for 230+ exercises and sports" },
            { Icon: Target, color: "var(--blue)", t: "Get a plan", s: "Chest, back, arms, legs splits and a matching meal plan" },
            { Icon: Leaf, color: "var(--teal)", t: "Eat smarter", s: "See if a meal is healthy and right for your goal" },
          ].map(({ Icon, color, t, s }) => (
            <div key={t} className="option-card" style={{ boxShadow: "none" }}>
              <div className="icon-tile" style={{ background: color }}>
                <Icon size={18} />
              </div>
              <div className="row-main">
                <div style={{ fontWeight: 600 }}>{t}</div>
                <div className="row-sub" style={{ whiteSpace: "normal" }}>
                  {s}
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
      ok: true,
    },
    { title: "About you", sub: "Used to calculate how many calories your body needs.", body: <ProfileFields p={p} set={set} />, ok: valid },
    { title: "Your goal", sub: "You can change this any time.", body: <OptionList options={GOALS} value={p.goal} onChange={(goal) => set({ goal })} />, ok: true },
    { title: "How active are you?", sub: "Outside of the workouts you'll log here.", body: <OptionList options={ACTIVITY} value={p.activity} onChange={(activity) => set({ activity })} />, ok: true },
    {
      title: "Training",
      sub: "So we can build the right split for you.",
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
              <label>Days per week</label>
              <Stepper value={p.trainingDays} min={2} max={6} onChange={(trainingDays) => set({ trainingDays })} />
            </div>
          </div>
          <div className="section-header">Diet</div>
          <div className="chips">
            {DIETS.map((d) => (
              <button key={d.value} className={`chip ${p.diet === d.value ? "active" : ""}`} onClick={() => set({ diet: d.value })}>
                {d.label}
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
            Back
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
          {step === 0 ? "Get started" : last ? "Build my plan" : "Continue"}
        </button>
      </div>
    </div>
  );
}
