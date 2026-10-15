import { useEffect, useState } from "react";
import { Activity as Pulse, ChevronRight, Delete, Dumbbell, HeartPulse, Lock, MoonStar, Pill, Plus, Salad, Stethoscope } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { cycleOf, cycleStatus } from "../lib/cycle";
import {
  FLOWS,
  SYMPTOMS,
  earlyWarnings,
  flagText,
  flowName,
  haidToday,
  healthCheck,
  pastCycles,
  patternText,
  pillDay,
  qadaOwed,
  symptomName,
  symptomPatterns,
  trainingTip,
} from "../lib/cycleCare";
import { hashPin, unlock, useCycleOpen } from "../lib/cycleLock";
import { actions, getState, useStore, useTodayKey } from "../lib/store";
import type { Flow, Food, Symptom } from "../lib/types";
import { foodHelp } from "../lib/periodFood";
import { FoodIcon } from "./FoodIcon";
import { FoodSheet } from "./FoodSheet";
import { Sheet, Stepper, Switch, haptic, showToast } from "./ui";

const shortDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "numeric", month: "short" });
};

// ── Privacy lock ─────────────────────────────────────────

/**
 * Four digits on a keypad. "unlock" opens the cycle section; "set" asks for a new PIN twice and
 * saves it (hashed).
 */
export function PinSheet({ open, mode, onClose, onDone }: { open: boolean; mode: "unlock" | "set"; onClose: () => void; onDone?: () => void }) {
  useLanguage();
  const [digits, setDigits] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  useEffect(() => {
    if (!open) return;
    setForgot(false);
    setDigits("");
    setFirst(null);
    setError("");
  }, [open]);

  const done = async (pin: string) => {
    if (mode === "unlock") {
      if (await unlock(pin)) {
        haptic("success");
        onDone?.();
        onClose();
      } else {
        haptic("medium");
        setError(t("Wrong PIN. Try again."));
        setDigits("");
      }
      return;
    }
    if (first === null) {
      setFirst(pin);
      setDigits("");
      return;
    }
    if (pin !== first) {
      haptic("medium");
      setError(t("The PINs didn't match. Start again."));
      setFirst(null);
      setDigits("");
      return;
    }
    const s = getState();
    actions.updateProfile({ cycle: { ...s.profile.cycle, pin: await hashPin(pin, s.personId) } });
    await unlock(pin);
    haptic("success");
    showToast(t("Cycle lock is on"));
    onDone?.();
    onClose();
  };
  const press = (k: string) => {
    setError("");
    const next = (digits + k).slice(0, 4);
    setDigits(next);
    haptic("light");
    if (next.length === 4) void done(next);
  };
  const title = mode === "unlock" ? t("Enter your cycle PIN") : first === null ? t("Choose a 4-digit PIN") : t("Enter it again");
  return (
    <Sheet open={open} onClose={onClose} title={t("Cycle lock")}>
      <div className="pin" data-testid="pin-pad">
        <p className="pin-title">{title}</p>
        <div className={`pin-dots${error ? " shake" : ""}`} aria-label={t("{n} of 4 digits", { n: digits.length })} role="status">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < digits.length ? "on" : ""} />
          ))}
        </div>
        <p className="pin-error" role="alert">
          {error}
        </p>
        <div className="pin-keys">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
            k === "" ? (
              <span key={i} />
            ) : k === "del" ? (
              <button key={i} className="pin-key ghost" aria-label={t("Delete")} onClick={() => setDigits((d) => d.slice(0, -1))}>
                <Delete size={22} />
              </button>
            ) : (
              <button key={i} className="pin-key" onClick={() => press(k)}>
                {k}
              </button>
            ),
          )}
        </div>
        {mode === "unlock" &&
          (forgot ? (
            <div className="card forgot" role="alert">
              <p style={{ margin: "0 0 10px" }}>{t("Without the PIN, the only way in is to erase your cycle data (periods, flow, symptoms and pill ticks) and start again. This can't be undone.")}</p>
              <div className="btn-row">
                <button className="btn small secondary" onClick={() => setForgot(false)}>
                  {t("Cancel")}
                </button>
                <button
                  className="btn small danger"
                  onClick={() => {
                    actions.eraseCycle();
                    showToast(t("Cycle data erased and lock removed"));
                    onClose();
                  }}
                >
                  {t("Erase and remove lock")}
                </button>
              </div>
            </div>
          ) : (
            <button className="link tap" onClick={() => setForgot(true)}>
              {t("Forgot your PIN?")}
            </button>
          ))}
      </div>
    </Sheet>
  );
}

/** What shows instead of cycle details while the lock is closed. */
export function LockedCycle({ testId = "cycle-locked" }: { testId?: string }) {
  useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="card cycle-card locked pressable" style={{ marginTop: 12 }} onClick={() => setOpen(true)} data-testid={testId}>
        <div className="icon-tile" style={{ background: "var(--label-3)" }}>
          <Lock size={18} />
        </div>
        <div className="row-main" style={{ textAlign: "left" }}>
          <div className="tile-title">{t("Cycle is locked")}</div>
          <div className="tile-sub">{t("Tap and enter your PIN to see it")}</div>
        </div>
        <ChevronRight size={16} className="chev" />
      </button>
      <PinSheet open={open} mode="unlock" onClose={() => setOpen(false)} />
    </>
  );
}

// ── Flow and symptoms ────────────────────────────────────

/** Tap chips to log today's flow and symptoms; patterns from past cycles show underneath. */
export function SymptomSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  useLanguage();
  const day = useStore((s) => s.days.find((d) => d.id === date));
  const periods = useStore((s) => s.periods);
  const days = useStore((s) => s.days);
  const patterns = symptomPatterns(periods, days);
  const flow = day?.flow;
  const symptoms = day?.symptoms ?? [];
  const setFlow = (f: Flow) => {
    haptic("light");
    actions.updateDay(date, (d) => ({ ...d, flow: d.flow === f ? undefined : f }));
  };
  const toggle = (x: Symptom) => {
    haptic("light");
    actions.updateDay(date, (d) => {
      const list = d.symptoms ?? [];
      return { ...d, symptoms: list.includes(x) ? list.filter((y) => y !== x) : [...list, x] };
    });
  };
  return (
    <Sheet open={open} onClose={onClose} title={t("How are you today?")}>
      <div className="section-header" style={{ marginTop: 0 }}>
        {t("Flow")}
      </div>
      <div className="chip-wrap" role="group" aria-label={t("Flow")}>
        {FLOWS.map((f) => (
          <button key={f} className={`chip flow-${f}${flow === f ? " active" : ""}`} aria-pressed={flow === f} onClick={() => setFlow(f)}>
            {flowName(f)}
          </button>
        ))}
      </div>
      <div className="section-header">{t("Symptoms")}</div>
      <div className="chip-wrap" role="group" aria-label={t("Symptoms")}>
        {SYMPTOMS.map((x) => (
          <button key={x} className={`chip${symptoms.includes(x) ? " active" : ""}`} aria-pressed={symptoms.includes(x)} onClick={() => toggle(x)}>
            {symptomName(x)}
          </button>
        ))}
      </div>
      <PeriodFoodButton date={date} />
      <div className="section-header">{t("Your patterns")}</div>
      {patterns.length ? (
        <div className="group">
          {patterns.slice(0, 5).map((p) => (
            <div className="row" key={`${p.symptom}-${p.when}`}>
              <div className="row-main">
                <div className="row-title" style={{ whiteSpace: "normal" }}>
                  {patternText(p)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="footnote">{t("Log symptoms for a couple of cycles and W will show when they usually come, and warn you a day or two ahead.")}</p>
      )}
    </Sheet>
  );
}

/** One line on the cycle card: today's logged flow and symptoms, and a heads-up from past patterns. */
export function SymptomSummary({ date, onOpen }: { date: string; onOpen: () => void }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const days = useStore((s) => s.days);
  const day = days.find((d) => d.id === date);
  const status = cycleStatus(cycleOf(profile), periods, date);
  const warnings = earlyWarnings(symptomPatterns(periods, days), status);
  const logged = [...(day?.flow ? [t("{flow} flow", { flow: flowName(day.flow) })] : []), ...(day?.symptoms ?? []).map(symptomName)];
  return (
    <>
      {warnings.length > 0 && (
        <p className="cycle-warning" data-testid="symptom-warning">
          <Pulse size={14} aria-hidden /> {t("Heads up: {list} often start around now.", { list: warnings.map((w) => symptomName(w.symptom).toLowerCase()).join(", ") })}
        </p>
      )}
      <button className="cycle-log pressable" onClick={onOpen} data-testid="symptom-log">
        <HeartPulse size={15} aria-hidden />
        <span className="cycle-log-text">{logged.length ? logged.join(" · ") : t("Log flow and symptoms")}</span>
        <ChevronRight size={15} className="chev" aria-hidden />
      </button>
    </>
  );
}

// ── History and health check ─────────────────────────────

export function CycleHistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const days = useStore((s) => s.days);
  const today = useTodayKey();
  const settings = cycleOf(profile);
  const cycles = pastCycles(periods, settings, days);
  const check = healthCheck(cycles, days, periods, settings, today);
  const patterns = symptomPatterns(periods, days);
  const recent = cycles.slice(-8).reverse();
  const most = Math.max(40, ...recent.map((c) => c.length ?? 0));
  return (
    <Sheet open={open} onClose={onClose} title={t("Cycle history")}>
      <div className="card" data-testid="cycle-health">
        <div className="summary-stats row3">
          <div className="stat">
            <span className="stat-label">{t("Average")}</span>
            <span className="stat-value">{check.average ?? "–"}<small>{t("days")}</small></span>
          </div>
          <div className="stat">
            <span className="stat-label">{t("Range")}</span>
            <span className="stat-value">{check.shortest === null ? "–" : check.shortest === check.longest ? check.shortest : `${check.shortest}–${check.longest}`}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t("Regular?")}</span>
            <span className="stat-value" style={{ fontSize: 17 }}>{check.regular === null ? t("Not yet") : check.regular ? t("Yes") : t("Varies")}</span>
          </div>
        </div>
        {check.regular === null && <p className="footnote" style={{ margin: "8px 0 0" }}>{t("Mark at least four periods to see how regular your cycle is.")}</p>}
      </div>

      {check.flags.length > 0 ? (
        <div className="card doctor-note" role="note" data-testid="doctor-note">
          <div className="tile-title" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Stethoscope size={17} /> {t("Worth mentioning to a doctor")}
          </div>
          <ul>
            {check.flags.map((f) => (
              <li key={f}>{flagText(f)}</li>
            ))}
          </ul>
          <p className="footnote" style={{ margin: 0 }}>
            {t("These can have simple causes (stress, weight change, training, the pill), but a doctor can check for things like anaemia, thyroid problems or PCOS. Your W report (Profile → Export) includes your cycles.")}
          </p>
        </div>
      ) : (
        cycles.length >= 4 && <p className="footnote">{t("Nothing unusual in your recent cycles.")}</p>
      )}

      {recent.length > 0 && (
        <>
          <div className="section-header">{t("Recent cycles")}</div>
          <div className="group cycle-bars">
            {recent.map((c) => (
              <div className="row" key={c.start}>
                <div className="cycle-bar-date">{shortDate(c.start)}</div>
                <div className="cycle-bar" aria-hidden>
                  <i className="bleed" style={{ width: `${(Math.min(c.bleeding, c.length ?? c.bleeding) / most) * 100}%` }} />
                  {c.length !== null && <i className="rest" style={{ width: `${((c.length - Math.min(c.bleeding, c.length)) / most) * 100}%` }} />}
                </div>
                <div className="cycle-bar-len tabular">{c.length !== null ? t("{n} days", { n: c.length }) : t("Now")}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {patterns.length > 0 && (
        <>
          <div className="section-header">{t("Your patterns")}</div>
          <div className="group">
            {patterns.slice(0, 6).map((p) => (
              <div className="row" key={`${p.symptom}-${p.when}`}>
                <div className="row-main">
                  <div className="row-title" style={{ whiteSpace: "normal" }}>
                    {patternText(p)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="footnote">{t("A typical cycle is 21–35 days and varies by less than 8 days. Estimates only, not a diagnosis.")}</p>
    </Sheet>
  );
}

// ── Training by phase (Train) ────────────────────────────

export function CycleTrainingCard({ onLighter }: { onLighter?: () => void }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const today = useTodayKey();
  const open = useCycleOpen();
  const tip = trainingTip(cycleStatus(cycleOf(profile), periods, today));
  if (!tip || !open) return null;
  const color = tip.tone === "lighter" ? "var(--pink)" : tip.tone === "push" ? "var(--green)" : "var(--indigo)";
  return (
    <div className="card cycle-train" data-testid="cycle-training" style={{ marginTop: 12 }}>
      <div className="icon-tile" style={{ background: color }}>
        <Dumbbell size={17} />
      </div>
      <div className="row-main">
        <div className="tile-title">{tip.title}</div>
        <div className="tile-sub" style={{ whiteSpace: "normal" }}>
          {tip.body}
        </div>
        {tip.tone === "lighter" && onLighter && (
          <button className="btn small secondary" style={{ marginTop: 10 }} onClick={onLighter}>
            {t("Start today's plan lighter (80%)")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Birth-control pill (Today) ───────────────────────────

export function PillCard({ today }: { today: string }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const taken = useStore((s) => !!s.days.find((d) => d.id === today)?.pill);
  const open = useCycleOpen();
  const pill = profile.sex === "female" ? profile.cycle.pill : undefined;
  const d = pillDay(pill, today);
  if (!d || !open) return null;
  return (
    <div className="card pill-card" style={{ marginTop: 12 }} data-testid="pill-card">
      <div className="icon-tile" style={{ background: d.active ? "var(--purple)" : "var(--label-3)" }}>
        <Pill size={18} />
      </div>
      <div className="row-main">
        <div className="tile-title">{d.active ? t("Pill · day {n} of {total}", { n: d.day, total: d.pack }) : t("Placebo or break week · day {n}", { n: d.breakDay })}</div>
        <div className="tile-sub">{d.active ? (taken ? t("Taken today") : t("Not taken yet · {time}", { time: pill!.time })) : t("No active pill today. A bleed now is normal. Next pack starts in {n} days.", { n: d.pack - d.day + 1 })}</div>
      </div>
      {d.active && (
        <button
          className={`btn small${taken ? " secondary" : ""}`}
          aria-pressed={taken}
          onClick={() => {
            haptic(taken ? "light" : "success");
            actions.updateDay(today, (x) => ({ ...x, pill: !x.pill }));
          }}
        >
          {taken ? t("Taken ✓") : t("Taken")}
        </button>
      )}
    </div>
  );
}

// ── Ramadan: haid days and fasts to replace (Today) ──────

export function QadaCard({ today }: { today: string }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const days = useStore((s) => s.days);
  const todayStats = days.find((d) => d.id === today);
  const [sheet, setSheet] = useState(false);
  const status = cycleStatus(cycleOf(profile), periods, today);
  const haid = haidToday(profile, status);
  // A period day in Ramadan is a fast to replace later: count it once.
  useEffect(() => {
    if (haid && !todayStats?.fastMissed) actions.updateDay(today, (d) => ({ ...d, fastMissed: true }));
  }, [haid, today, todayStats?.fastMissed]);
  const owed = qadaOwed(days, profile.cycle.qadaAdjust);
  if (!haid && owed === 0) return null;
  const made = !!todayStats?.qada;
  return (
    <>
      <div className="card qada-card" style={{ marginTop: 12 }} data-testid="qada-card">
        <div className="icon-tile" style={{ background: "var(--indigo)" }}>
          <MoonStar size={18} />
        </div>
        <div className="row-main">
          <div className="tile-title">{haid ? t("Not fasting today · haid") : t("Fasts to replace: {n}", { n: owed })}</div>
          <div className="tile-sub" style={{ whiteSpace: "normal" }}>
            {haid
              ? t("Sahur and iftar reminders rest until your period ends. Today is added to your fasts to replace ({n} so far).", { n: owed })
              : profile.fasting === "ramadan"
                ? t("Replace them after Ramadan, before the next one.")
                : t("Mondays and Thursdays are good days to replace a fast. Tick it off when you do.")}
          </div>
        </div>
        <button className="icon-btn" aria-label={t("Fasts to replace")} onClick={() => setSheet(true)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title={t("Fasts to replace")}>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="big-number tabular" data-testid="qada-owed">
            {owed}
          </div>
          <div className="muted">{t("fasts still to replace")}</div>
        </div>
        {profile.fasting !== "ramadan" && owed > 0 && (
          <button
            className={`btn${made ? " secondary" : ""}`}
            style={{ marginTop: 12 }}
            onClick={() => {
              haptic("success");
              actions.updateDay(today, (d) => ({ ...d, qada: !d.qada }));
              if (!made) showToast(t("Fast replaced · {n} to go", { n: Math.max(0, owed - 1) }));
            }}
          >
            {made ? t("Replaced today ✓ (undo)") : t("I replaced a fast today")}
          </button>
        )}
        <div className="group" style={{ marginTop: 12 }}>
          <div className="field">
            <label>{t("Add or remove by hand")}</label>
            <Stepper
              value={profile.cycle.qadaAdjust ?? 0}
              min={-60}
              max={60}
              onChange={(qadaAdjust) => actions.updateProfile({ cycle: { ...profile.cycle, qadaAdjust } })}
              format={(v) => (v > 0 ? `+${v}` : String(v))}
              label={t("fasts added by hand")}
            />
          </div>
        </div>
        <p className="footnote">{t("Period days in Ramadan are counted for you. Add fasts missed for illness or travel by hand.")}</p>
      </Sheet>
    </>
  );
}

// ── Pill settings (Profile) ──────────────────────────────

/** Pill on or off, when the pack started, how many active and break or placebo days, and a reminder. */
export function PillSettingsGroup() {
  useLanguage();
  const cycle = useStore((s) => s.profile.cycle);
  const today = useTodayKey();
  const pill = cycle.pill ?? { on: false, packStart: today, active: 21, breakDays: 7, time: "21:00", remind: true };
  const set = (x: Partial<typeof pill>) => actions.updateProfile({ cycle: { ...cycle, pill: { ...pill, ...x } } });
  return (
    <div className="group" style={{ marginTop: 12 }} data-testid="pill-settings">
      <div className="field">
        <label>
          {t("Birth-control pill")}
          <span className="field-sub">{t("Daily tick and reminder, with your break or placebo week")}</span>
        </label>
        <Switch checked={pill.on} onChange={(on) => set({ on, packStart: pill.packStart || today })} label={t("Birth-control pill")} />
      </div>
      {pill.on && (
        <>
          <div className="field">
            <label htmlFor="pill-start">{t("This pack started")}</label>
            <input id="pill-start" type="date" value={pill.packStart} max={today} onChange={(e) => e.target.value && set({ packStart: e.target.value })} style={{ width: "auto", minWidth: 140, flex: "none" }} />
          </div>
          <div className="field">
            <label>{t("Active pills")}</label>
            <Stepper value={pill.active} min={21} max={28} onChange={(active) => set({ active, breakDays: Math.min(pill.breakDays, 28 - active) })} format={(v) => t("{n} days", { n: v })} label={t("active pills")} />
          </div>
          <div className="field">
            <label>{t("Break or placebo days")}</label>
            <Stepper value={pill.breakDays} min={0} max={Math.max(0, 28 - pill.active)} onChange={(breakDays) => set({ breakDays })} format={(v) => t("{n} days", { n: v })} label={t("break or placebo days")} />
          </div>
          <div className="field">
            <label htmlFor="pill-time">{t("Reminder")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input id="pill-time" type="time" value={pill.time} onChange={(e) => e.target.value && set({ time: e.target.value })} style={{ width: "auto", flex: "none" }} disabled={!pill.remind} />
              <Switch checked={pill.remind} onChange={(remind) => set({ remind })} label={t("Pill reminder")} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Food for how you feel ────────────────────────────────

/** Opens the foods that help with today's flow and symptoms; shows what they're for. */
export function PeriodFoodButton({ date }: { date: string }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const day = useStore((s) => s.days.find((d) => d.id === date));
  const [open, setOpen] = useState(false);
  const help = foodHelp(day, cycleStatus(cycleOf(profile), periods, date)?.phase, profile);
  if (!help.length) return null;
  return (
    <>
      <button className="cycle-log pressable period-food-btn" onClick={() => setOpen(true)} data-testid="period-food">
        <Salad size={15} aria-hidden />
        <span className="cycle-log-text">{t("Foods that help: {list}", { list: help.map((h) => t(h.title).toLowerCase()).join(", ") })}</span>
        <ChevronRight size={15} className="chev" aria-hidden />
      </button>
      <PeriodFoodSheet open={open} onClose={() => setOpen(false)} date={date} />
    </>
  );
}

export function PeriodFoodSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const day = useStore((s) => s.days.find((d) => d.id === date));
  const [picked, setPicked] = useState<Food | null>(null);
  const help = foodHelp(day, cycleStatus(cycleOf(profile), periods, date)?.phase, profile);
  return (
    <>
      <Sheet open={open} onClose={onClose} title={t("Foods that help")}>
        <p className="footnote" style={{ margin: "0 0 4px" }}>
          {t("Picked for the flow and symptoms you logged today. Tap + to log one.")}
        </p>
        {help.map((h) => (
          <section key={h.key} data-testid={`food-help-${h.key}`}>
            <div className="section-header">{t(h.title)}</div>
            <p className="tile-sub" style={{ margin: "0 0 8px", whiteSpace: "normal" }}>
              {t(h.intro)}
            </p>
            <div className="group">
              {h.foods.map(({ food, why }) => (
                <div className="row" key={food.id}>
                  <FoodIcon name={food.name} category={food.category} />
                  <div className="row-main">
                    <div className="row-title">{food.name}</div>
                    <div className="row-sub" style={{ whiteSpace: "normal" }}>
                      {t(why)}
                    </div>
                  </div>
                  <button className="icon-btn" aria-label={t("Log {food}", { food: food.name })} onClick={() => setPicked(food)}>
                    <Plus size={18} />
                  </button>
                </div>
              ))}
            </div>
            <p className="footnote" style={{ margin: "8px 0 0" }}>
              <strong>{t("Cut back on:")}</strong> {t(h.limit)}
            </p>
            {h.warn && (
              <p className="cycle-warning" role="note">
                <Stethoscope size={14} aria-hidden /> {t(h.warn)}
              </p>
            )}
          </section>
        ))}
        {!help.length && <p className="footnote">{t("Log your flow or a symptom and foods that help will show here.")}</p>}
        <p className="footnote">{t("General guidance from nutrition research, not medical advice. Foods that clash with your diet or allergies are left out.")}</p>
      </Sheet>
      <FoodSheet food={picked} onClose={() => setPicked(null)} />
    </>
  );
}
