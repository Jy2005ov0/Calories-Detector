import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Dumbbell, Info, Salad, Target } from "lucide-react";
import { SPLITS } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { BMI_BANDS, bodyCheck } from "../lib/recommend";
import { actions, useStore } from "../lib/store";
import { SPRING, Sheet, haptic, showToast } from "./ui";

const GAUGE_MIN = 15;
const GAUGE_MAX = 35;
const GOAL_LABEL = { lose: "Lose fat", maintain: "Maintain & tone", gain: "Build muscle" } as const;

function BmiGauge({ value }: { value: number }) {
  const pct = (v: number) => ((Math.min(GAUGE_MAX, Math.max(GAUGE_MIN, v)) - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ position: "relative", height: 10, borderRadius: 999, overflow: "hidden", display: "flex" }}>
        {BMI_BANDS.map((b) => (
          <div key={b.key} style={{ width: `${pct(Math.min(b.to, GAUGE_MAX)) - pct(Math.max(b.from, GAUGE_MIN))}%`, background: b.color }} />
        ))}
      </div>
      <div style={{ position: "relative", height: 16 }}>
        <motion.div
          aria-hidden
          initial={false}
          animate={{ left: `${pct(value)}%` }}
          transition={SPRING}
          style={{
            position: "absolute",
            top: -15,
            width: 4,
            height: 20,
            marginLeft: -2,
            borderRadius: 2,
            background: "var(--label)",
            boxShadow: "0 0 0 2px var(--bg-elev)",
          }}
        />
      </div>
      {/* Tick labels sit exactly on the band boundaries. */}
      <div className="row-sub tabular" aria-hidden style={{ position: "relative", height: 18, marginTop: -4 }}>
        {[GAUGE_MIN, 18.5, 23, 27.5, GAUGE_MAX].map((v, i, all) => (
          <span
            key={v}
            style={{
              position: "absolute",
              left: `${pct(v)}%`,
              transform: i === 0 ? "none" : i === all.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BodyCheckSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useStore((s) => s.profile);
  const [height, setHeight] = useState(String(profile.heightCm));
  const [weight, setWeight] = useState(String(profile.weightKg));

  useEffect(() => {
    if (open) {
      setHeight(String(profile.heightCm));
      setWeight(String(profile.weightKg));
    }
    // Refill from the profile each time the sheet opens, not on every profile change.
  }, [open]);

  const h = parseFloat(height.replace(",", "."));
  const w = parseFloat(weight.replace(",", "."));
  const valid = h >= 120 && h <= 230 && w >= 30 && w <= 300;
  const result = useMemo(() => (valid ? bodyCheck(profile, h, w) : null), [valid, profile, h, w]);

  const apply = () => {
    if (!result) return;
    actions.updateProfile({ heightCm: h, weightKg: w, goal: result.goal, trainingDays: result.training.days });
    actions.setSplit(result.training.split);
    haptic("success");
    showToast("Plan updated from your body check");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Body check">
      <p className="subtitle" style={{ marginTop: 4 }}>
        Enter your height and weight to see your BMI (body mass index) and what to train and eat.
      </p>
      <div className="group">
        <div className="field">
          <label htmlFor="bc-height">Height</label>
          <input id="bc-height" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
          <span className="muted" style={{ width: 28 }}>
            cm
          </span>
        </div>
        <div className="field">
          <label htmlFor="bc-weight">Weight</label>
          <input id="bc-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <span className="muted" style={{ width: 28 }}>
            kg
          </span>
        </div>
      </div>

      {!valid && (
        <p className="footnote" role="alert">
          Enter a height between 120 and 230 cm and a weight between 30 and 300 kg.
        </p>
      )}

      {result && (
        <>
          <div className="card" style={{ marginTop: 14 }} aria-live="polite">
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="big-number" data-testid="bmi-value">
                {round(result.bmi, 1).toFixed(1)}
              </span>
              <span className="badge" style={{ background: result.band.fill, color: "#fff", fontSize: 13 }}>
                {result.band.label}
              </span>
            </div>
            <div className="row-sub" style={{ marginTop: 4 }}>
              BMI = weight ÷ height² = {w} ÷ {(h / 100).toFixed(2)}²
            </div>
            <BmiGauge value={result.bmi} />
            <p className="row-sub" style={{ whiteSpace: "normal", marginTop: 10 }}>
              Healthy weight for {h} cm: <b style={{ color: "var(--label)" }}>
                {result.range.min}–{result.range.max} kg
              </b>
              {result.toHealthy !== 0 &&
                ` · ${result.toHealthy < 0 ? "lose" : "gain"} ${Math.abs(round(result.toHealthy, 1))} kg to get there (~${result.weeksToHealthy} weeks)`}
            </p>
          </div>

          <div className="section-header">Recommended for you</div>
          <div className="card">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="icon-tile" style={{ background: "var(--blue)" }}>
                <Target size={17} />
              </div>
              <div className="row-main">
                <div className="muted" style={{ fontSize: 13 }}>
                  Goal
                </div>
                <div style={{ fontWeight: 700 }}>{GOAL_LABEL[result.goal]}</div>
                <div className="row-sub" style={{ whiteSpace: "normal" }}>
                  {result.goalReason}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="icon-tile" style={{ background: "var(--green)" }}>
                <Dumbbell size={17} />
              </div>
              <div className="row-main">
                <div className="muted" style={{ fontSize: 13 }}>
                  Training · {SPLITS.find((s) => s.id === result.training.split)!.name}
                </div>
                <div style={{ fontWeight: 700 }}>{result.training.headline}</div>
                <ul className="row-sub" style={{ whiteSpace: "normal", paddingLeft: 18, margin: "6px 0 0" }}>
                  {result.training.points.map((p) => (
                    <li key={p} style={{ marginTop: 4 }}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="icon-tile" style={{ background: "var(--orange)" }}>
                <Salad size={17} />
              </div>
              <div className="row-main">
                <div className="muted" style={{ fontSize: 13 }}>
                  What to eat
                </div>
                <div style={{ fontWeight: 700 }}>{result.nutrition.headline}</div>
                <div className="row-sub" style={{ whiteSpace: "normal" }}>
                  Carbs {result.nutrition.targets.carbs} g · Fat {result.nutrition.targets.fat} g · Fibre ≥ {result.nutrition.targets.fiber} g
                </div>
                <div className="pill-list">
                  {result.nutrition.eat.map((f) => (
                    <span key={f} className="badge" style={{ color: "var(--green-ink)" }}>
                      {f}
                    </span>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                  Limit
                </div>
                <div className="pill-list" style={{ marginTop: 4 }}>
                  {result.nutrition.limit.map((f) => (
                    <span key={f} className="badge" style={{ color: "var(--red)" }}>
                      {f}
                    </span>
                  ))}
                </div>
                <ul className="row-sub" style={{ whiteSpace: "normal", paddingLeft: 18, margin: "10px 0 0" }}>
                  {result.nutrition.points.map((p) => (
                    <li key={p} style={{ marginTop: 4 }}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="spacer" />
          <button className="btn" onClick={apply}>
            Use this plan
          </button>
          <p className="footnote">Updates your height, weight, goal and training split. You can change them any time in Profile and Plan.</p>
          <div className="disclaimer">
            <Info size={14} />
            <span>
              {result.caveat} Uses the Asia-Pacific BMI bands (healthy 18.5–22.9). Calories also use your age ({profile.age}) and sex from Profile.
            </span>
          </div>
        </>
      )}
    </Sheet>
  );
}
