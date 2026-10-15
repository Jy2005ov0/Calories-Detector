import { useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import {
  Barcode,
  CalendarDays,
  CalendarHeart,
  ChevronRight,
  Dumbbell,
  Flame,
  LineChart,
  Mic,
  MoonStar,
  NotebookPen,
  Scale,
  Search,
  Trash2,
  Utensils,
  History,
} from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { exName, useExerciseNames } from "../i18n/exercises";
import { mealLabel, mealOptions } from "../lib/api";
import {
  formatDuration,
  plural,
  sessionKcal,
  sessionMinutes,
} from "../lib/fitness";
import { bmi, round, sum, targets } from "../lib/nutrition";
import {
  cycleOf,
  cycleStatus,
  lateAdvice,
  periodDue,
  phaseName,
  phaseTip,
} from "../lib/cycle";
import { fastStatus, logStreak } from "../lib/progress";
import { bmiBand } from "../lib/recommend";
import { actions, todayKey, useStore, useTodayKey } from "../lib/store";
import type { LogEntry, MealType } from "../lib/types";
import {
  Bar,
  MacroBars,
  Ring,
  SPRING,
  Sheet,
  haptic,
  showToast,
  useNow,
} from "../components/ui";
import { WaterControl } from "../components/ProgressSheet";
import { LogEntrySheet, deleteLogEntry } from "../components/LogEntrySheet";
import { CycleCalendar } from "../components/CycleCalendar";
import { CycleHistorySheet, LockedCycle, PeriodFoodButton, PillCard, QadaCard, SymptomSheet, SymptomSummary } from "../components/CycleCare";
import { cravingSwaps, cycleKcal, haidToday, inFertileWindow } from "../lib/cycleCare";
import { useCycleOpen } from "../lib/cycleLock";
import { LateAdviceSheetBody } from "../components/LateAdviceSheet";
import { PeopleSheet, householdSize } from "../components/People";
import { QuickAddSheet, VoiceLogSheet } from "../components/QuickLog";
import { CheckInCard, StepsRing, SupplementsCard } from "../components/Daily";
import { DailyTargetButton } from "../components/CalorieTarget";
import { AvatarSwitch } from "../components/AvatarSwitch";
import { WeeklyReportSheet } from "../components/WeeklyReport";
import { MealIdeasCard } from "../components/MealIdeas";
import { stepKcal, useStepUpdates } from "../lib/steps";
import { addDays } from "../lib/progress";
import type { SheetKind, Tab } from "../App";
import { FoodIcon, MealIcon } from "../components/FoodIcon";

const hm = (min: number) =>
  min >= 60
    ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`
    : `${min}m`;

/** Where the person is in their Ramadan or 16:8 fast. */
function FastCard({ now }: { now: number }) {
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const f = fastStatus(profile, new Date(now));
  // A period day in Ramadan isn't a fasting day (the Fasts to replace card says so).
  if (!f || haidToday(profile, cycleStatus(cycleOf(profile), periods, todayKey(new Date(now))))) return null;
  const ramadan = profile.fasting === "ramadan";
  const title = f.eating
    ? ramadan
      ? t("Sahur ends in {time}", { time: hm(f.minutesLeft) })
      : t("Eating window closes in {time}", { time: hm(f.minutesLeft) })
    : ramadan
      ? t("Iftar in {time}", { time: hm(f.minutesLeft) })
      : t("Fasting · window opens in {time}", { time: hm(f.minutesLeft) });
  const sub = ramadan
    ? t("Sahur until {sahur} · Iftar at {iftar}", {
        sahur: f.closes,
        iftar: f.opens,
      })
    : t("Eat between {from} and {to}", { from: f.opens, to: f.closes });
  return (
    <div
      className="card"
      style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}
      data-testid="fast-card"
    >
      <div
        className="icon-tile"
        style={{ background: f.eating ? "var(--green)" : "var(--indigo)" }}
      >
        <MoonStar size={18} />
      </div>
      <div className="row-main">
        <div className="tile-title">{title}</div>
        <div className="tile-sub">{sub}</div>
      </div>
    </div>
  );
}

const longDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

/** Cycle day, phase and what it means for training and food; a one-tap "Period started" when it's due. */
function CycleCard({ today }: { today: string }) {
  const profile = useStore((s) => s.profile);
  const periods = useStore((s) => s.periods);
  const log = useStore((s) => s.log);
  const weights = useStore((s) => s.weights);
  const sessions = useStore((s) => s.sessions);
  const [calendar, setCalendar] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [swaps, setSwaps] = useState(false);
  const unlocked = useCycleOpen();
  const cycle = cycleOf(profile);
  if (!cycle.on) return null;
  if (!unlocked) return <LockedCycle />;
  const calendarButton = (
    <button
      className="btn small secondary"
      style={{ marginTop: 10 }}
      onClick={() => setCalendar(true)}
      data-testid="period-calendar-btn"
    >
      <CalendarDays size={16} /> {t("Period calendar")}
    </button>
  );
  // Always the same element in the same place, so marking a day (which changes the card) doesn't reset it.
  const c = cycleStatus(cycle, periods, today);
  const advice = lateAdvice(c, {
    periods,
    weights,
    log,
    sessions,
    profile,
    kcalTarget: targets(profile).kcal,
    today,
  });
  const logStart = () => {
    actions.logPeriod(today);
    setAdviceOpen(false);
    showToast(t("Period logged · day 1"));
  };
  const sheet = (
    <>
      <CycleCalendar open={calendar} onClose={() => setCalendar(false)} />
      <SymptomSheet open={symptomsOpen} onClose={() => setSymptomsOpen(false)} date={today} />
      <CycleHistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <Sheet
        open={adviceOpen && !!advice}
        onClose={() => setAdviceOpen(false)}
        title={t("Period late")}
      >
        {advice && (
          <LateAdviceSheetBody advice={advice} onStarted={logStart} />
        )}
      </Sheet>
    </>
  );
  if (!c) {
    return (
      <>
        {sheet}
        <div
          className="card cycle-card"
          style={{ marginTop: 12 }}
          data-testid="cycle-card"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="icon-tile" style={{ background: "var(--pink)" }}>
              <CalendarHeart size={18} />
            </div>
            <div className="row-main">
              <div className="tile-title">{t("Cycle tracking is on")}</div>
              <div className="tile-sub">
                {t("Mark your last period on the calendar to see predictions.")}
              </div>
            </div>
          </div>
          <div className="btn-row">
            {calendarButton}
            <button
              className="btn small secondary"
              style={{ marginTop: 10 }}
              onClick={logStart}
            >
              {t("Started today")}
            </button>
          </div>
        </div>
      </>
    );
  }
  const extraKcal = cycleKcal(cycle, c);
  const fertileNow = !!cycle.fertile && inFertileWindow(c);
  const title =
    c.phase === "period"
      ? t("Period · day {n}", { n: c.day })
      : c.phase === "late"
        ? t("Period late · day {n}", { n: c.day })
        : t("Day {n} · {phase}", { n: c.day, phase: phaseName(c.phase) });
  const next =
    c.daysUntil > 1
      ? t("Next period in {n} days · {date}", {
          n: c.daysUntil,
          date: longDate(c.nextStart),
        })
      : c.daysUntil === 1
        ? t("Next period expected tomorrow")
        : c.daysUntil === 0
          ? t("Next period expected today")
          : t("Expected {date}", { date: longDate(c.nextStart) });
  return (
    <>
      {sheet}
      <div
        className="card cycle-card"
        style={{ marginTop: 12 }}
        data-testid="cycle-card"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="icon-tile" style={{ background: "var(--pink)" }}>
            <CalendarHeart size={18} />
          </div>
          <div className="row-main">
            <div className="tile-title">{title}</div>
            <div className="tile-sub">{next}</div>
            {fertileNow && (
              <div className="tile-sub fertile-note" data-testid="fertile-now">
                {t("Fertile window (estimate, not birth control)")}
              </div>
            )}
          </div>
        </div>
        <p className="tile-sub" style={{ margin: "10px 0 0" }}>
          {phaseTip(c)}
        </p>
        {extraKcal > 0 && (
          <p className="tile-sub cycle-extra" data-testid="luteal-kcal">
            {t("+{n} kcal added to today's target for the days before your period.", { n: extraKcal })}
          </p>
        )}
        {(c.phase === "luteal" || c.phase === "period") && (
          <>
            <button className="link tap cycle-swaps-toggle" aria-expanded={swaps} onClick={() => setSwaps((v) => !v)}>
              {swaps ? t("Hide craving swaps") : t("Craving something? Smart swaps")}
            </button>
            {swaps && (
              <ul className="cycle-swaps" data-testid="craving-swaps">
                {cravingSwaps().map((x) => (
                  <li key={x.craving}>
                    <strong>{x.craving}</strong> → {x.swap}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <SymptomSummary date={today} onOpen={() => setSymptomsOpen(true)} />
        <PeriodFoodButton date={today} />
        <div className="btn-row">
          {advice && (
            <button
              className="btn small"
              style={{ marginTop: 10 }}
              onClick={() => setAdviceOpen(true)}
            >
              {t("What to do")}
            </button>
          )}
          {calendarButton}
          <button className="btn small secondary" style={{ marginTop: 10 }} onClick={() => setHistoryOpen(true)}>
            <History size={16} /> {t("History")}
          </button>
          {periodDue(c) && (
            <button
              className="btn small secondary"
              style={{ marginTop: 10 }}
              onClick={logStart}
            >
              {t("Started today")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * A food in today's log. Tap it to change the amount or meal, swipe it left (or tap the bin) to delete.
 * Deleting always offers Undo.
 */
function LogRow({ e, onEdit }: { e: LogEntry; onEdit: () => void }) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-96, -24, 0], [1, 0.4, 0]);
  // A swipe that starts on a button must not also count as tapping it (that deleted twice).
  const swiped = useRef(false);
  return (
    <div className="swipe-row">
      <motion.div className="swipe-delete" style={{ opacity: reveal }} aria-hidden>
        <Trash2 size={18} /> {t("Delete")}
      </motion.div>
      <motion.div
        className="row"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -110, right: 0 }}
        dragElastic={{ left: 0.25, right: 0 }}
        dragSnapToOrigin
        style={{ x, touchAction: "pan-y" }}
        onPointerDownCapture={() => (swiped.current = false)}
        onDragStart={() => (swiped.current = true)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -90 || info.velocity.x < -700) deleteLogEntry(e);
        }}
        onClickCapture={(ev) => {
          if (!swiped.current) return;
          ev.preventDefault();
          ev.stopPropagation();
        }}
      >
        <FoodIcon name={e.name} size={36} />
        <button className="row-main log-edit" onClick={onEdit} aria-label={t("Edit {name}", { name: e.name })}>
          <div className="row-title">{e.name}</div>
          <div className="row-sub">
            {e.note ? `${e.note} · ` : ""}
            {round(e.grams)} g · P {round(e.nutrients.protein)} · C {round(e.nutrients.carbs)} · F {round(e.nutrients.fat)}
          </div>
        </button>
        <span className="row-value">{round(e.nutrients.kcal)}</span>
        <button className="icon-btn" aria-label={t("Remove {name}", { name: e.name })} onClick={() => deleteLogEntry(e)}>
          <Trash2 size={15} />
        </button>
      </motion.div>
    </div>
  );
}

export function Today({
  go,
  openSheet,
}: {
  go: (t: Tab) => void;
  openSheet: (k: SheetKind) => void;
}) {
  useLanguage();
  useExerciseNames();
  const profile = useStore((s) => s.profile);
  const log = useStore((s) => s.log);
  const sessions = useStore((s) => s.sessions);
  const activeId = useStore((s) => s.activeSessionId);
  const now = useNow(activeId ? 1000 : 30_000);
  const today = useTodayKey();
  // Small phones (iPhone SE 1st gen): smaller rings so calories and steps stay side by side.
  const narrow = typeof window !== "undefined" && window.innerWidth < 360;
  // Before a period, a little more if the person asked for it.
  const periods = useStore((s) => s.periods);
  const base = targets(profile);
  const tg = { ...base, kcal: base.kcal + cycleKcal(cycleOf(profile).on ? profile.cycle : {}, cycleStatus(cycleOf(profile), periods, today)) };
  const bmiValue = bmi(profile);

  const entries = useMemo(
    () => log.filter((e) => e.date === today),
    [log, today],
  );
  const eaten = useMemo(() => sum(entries.map((e) => e.nutrients)), [entries]);
  const todaysSessions = sessions.filter((s) => s.date === today);
  const active = sessions.find((s) => s.id === activeId);
  useStepUpdates(today);
  const stepsToday = useStore((s) => s.days.find((d) => d.id === today)?.steps ?? 0);
  const walkKcal = profile.stepsOn && profile.stepsInBudget ? stepKcal(stepsToday, profile.weightKg) : 0;
  const burned =
    todaysSessions.reduce(
      (a, s) => a + (s.endedAt ? s.kcal : sessionKcal(s, profile.weightKg, now)),
      0,
    ) + walkKcal;
  const remaining = tg.kcal - eaten.kcal + burned;

  const personId = useStore((s) => s.personId);
  const household = useStore(householdSize);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const streak = useMemo(() => logStreak(log, today), [log, today]);
  // Ramadan shows sahur / iftar / moreh; lunch only if something was logged there.
  const meals: MealType[] = [
    ...mealOptions().map((m) => m.value),
    ...(["lunch"] as MealType[]).filter(
      (m) =>
        !mealOptions().some((o) => o.value === m) &&
        entries.some((e) => e.meal === m),
    ),
  ];

  const date = new Date().toLocaleDateString(locale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hour = new Date().getHours();
  const greet =
    hour < 12
      ? t("Good morning")
      : hour < 18
        ? t("Good afternoon")
        : t("Good evening");

  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [quick, setQuick] = useState<"add" | "voice" | "report" | null>(null);
  const yesterday = addDays(today, -1);
  const copyYesterday = (m: MealType) => {
    const ids = actions.copyMeal(yesterday, today, m);
    if (!ids.length) return;
    haptic("success");
    showToast(t("Copied yesterday's {meal} · {n} foods", { meal: mealLabel(m), n: ids.length }), {
      label: t("Undo"),
      run: () => actions.removeLogs(ids),
    });
  };

  return (
    <div className="screen">
      <PeopleSheet open={peopleOpen} onClose={() => setPeopleOpen(false)} />
      <LogEntrySheet entry={editing} onClose={() => setEditing(null)} />
      <QuickAddSheet open={quick === "add"} onClose={() => setQuick(null)} />
      <VoiceLogSheet open={quick === "voice"} onClose={() => setQuick(null)} />
      <WeeklyReportSheet open={quick === "report"} onClose={() => setQuick(null)} />
      <p
        className="subtitle"
        style={{
          margin: "8px 0 0",
          textTransform: "uppercase",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {date}
      </p>
      <div className="title-row">
        <h1 className="large-title">
          {greet}
          {profile.name ? `, ${profile.name}` : ""}
        </h1>
        {(household > 1 || !!profile.photo || streak > 0) && (
          // Stacked on the right, so a long name and "Good afternoon" never push them off a small screen.
          <div className="title-actions">
            {(household > 1 || !!profile.photo) && (
<AvatarSwitch id={personId} name={profile.name} photo={profile.photo} onOpen={() => setPeopleOpen(true)} />
            )}
            {streak > 0 && (
              <button
                className="streak-chip pressable"
                onClick={() => openSheet("progress")}
                aria-label={t("{n}-day logging streak", { n: streak })}
              >
                <Flame size={15} /> {streak}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="spacer" />

      {active && (
        <motion.button
          className="live-banner pressable"
          onClick={() => go("train")}
          layout
          transition={SPRING}
          style={{ marginBottom: 12 }}
        >
          <span className="pulse" />
          <div className="row-main">
            <div style={{ fontWeight: 600 }}>
              {t("{title} · clocked in", { title: exName(active.title) })}
            </div>
            <div style={{ fontSize: 14, opacity: 0.85 }} className="tabular">
              {formatDuration(sessionMinutes(active, now))} ·{" "}
              {round(sessionKcal(active, profile.weightKg, now))} kcal
            </div>
          </div>
          <ChevronRight size={18} />
        </motion.button>
      )}

      <div className="card">
        <div
          data-tour="summary"
          className="summary"
        >
          <div className="ring-col">
            <Ring
              progress={eaten.kcal / (tg.kcal + burned)}
              size={narrow ? 116 : 136}
              stroke={narrow ? 12 : 14}
            >
              <div>
                <div
                  className="stat-value"
                  style={{
                    fontSize: 28,
                    color: remaining < 0 ? "var(--red)" : undefined,
                  }}
                >
                  {Math.abs(round(remaining))}
                </div>
                <div className="stat-label" style={{ justifyContent: "center" }}>
                  {remaining < 0 ? t("kcal over") : t("kcal left")}
                </div>
              </div>
            </Ring>
          </div>
          <StepsRing today={today} size={narrow ? 92 : 112} />
        </div>
        <div className="summary-stats row3">
          <div className="stat">
            <span className="stat-label">
              <Utensils size={13} /> {t("Eaten")}
            </span>
            <span className="stat-value">
              {round(eaten.kcal)}
              <small>kcal</small>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">
              <Flame size={13} color="var(--orange)" /> {t("Burned")}
            </span>
            <span className="stat-value">
              {round(burned)}
              <small>kcal</small>
            </span>
          </div>
          <DailyTargetButton kcal={tg.kcal} />
        </div>
        <div className="spacer" />
        <div className="spacer" />
        <MacroBars n={eaten} t={tg} />
      </div>

      <div className="card" style={{ marginTop: 12 }} data-tour="water">
        <WaterControl compact />
        <div className="hairline" />
        <button
          className="progress-link pressable"
          onClick={() => openSheet("progress")}
        >
          <LineChart size={17} color="var(--green)" />
          <span className="row-main" style={{ textAlign: "left" }}>
            {t("Weight, water and streaks")}
          </span>
          <span className="link" style={{ fontSize: 15 }}>
            {t("Progress")}
          </span>
          <ChevronRight size={16} className="chev" />
        </button>
        <div className="hairline" />
        <button
          className="progress-link pressable"
          onClick={() => setQuick("report")}
        >
          <CalendarDays size={17} color="var(--blue)" />
          <span className="row-main" style={{ textAlign: "left" }}>
            {t("Your week at a glance")}
          </span>
          <span className="link" style={{ fontSize: 15 }}>
            {t("Weekly report")}
          </span>
          <ChevronRight size={16} className="chev" />
        </button>
      </div>

      <FastCard now={now} />
      <CycleCard today={today} />
      <QadaCard today={today} />
      <PillCard today={today} />
      <CheckInCard today={today} />

      <div className="tiles" style={{ marginTop: 12 }} data-tour="log-tiles">
        <button className="tile" onClick={() => go("food")}>
          <div className="icon-tile" style={{ background: "var(--orange)" }}>
            <Search size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Search food")}</div>
            <div className="tile-sub">{t("Type to look it up")}</div>
          </div>
        </button>
        <button
          className="tile"
          onClick={() => openSheet("barcode")}
          data-tour="barcode"
        >
          <div className="icon-tile" style={{ background: "var(--purple)" }}>
            <Barcode size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Scan barcode")}</div>
            <div className="tile-sub">{t("Packaged food")}</div>
          </div>
        </button>
        <button className="tile" onClick={() => setQuick("voice")}>
          <div className="icon-tile" style={{ background: "var(--blue)" }}>
            <Mic size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Say it")}</div>
            <div className="tile-sub">{t("Speak or type a meal")}</div>
          </div>
        </button>
        <button className="tile" onClick={() => setQuick("add")}>
          <div className="icon-tile" style={{ background: "var(--green)" }}>
            <NotebookPen size={18} />
          </div>
          <div>
            <div className="tile-title">{t("Quick add")}</div>
            <div className="tile-sub">{t("Just the calories")}</div>
          </div>
        </button>
      </div>

      <MealIdeasCard today={today} meals={meals} burned={burned} now={now} />

      <SupplementsCard today={today} />

      <button
        className="card pressable"
        data-tour="body-check"
        onClick={() => openSheet("bodyCheck")}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div
          className="icon-tile"
          style={{ background: bmiBand(bmiValue).color }}
        >
          <Scale size={18} />
        </div>
        <div className="row-main">
          <div className="tile-title">
            {t("Body check · BMI {bmi}", { bmi: bmiValue.toFixed(1) })}
          </div>
          <div className="tile-sub">
            {t("{band} · see what to train and eat", {
              band: t(bmiBand(bmiValue).label),
            })}
          </div>
        </div>
        <ChevronRight size={18} className="chev" />
      </button>

      <div className="section-header">{t("Today's limits")}</div>
      <div className="card">
        {[
          {
            k: t("Sugar"),
            icon: "🍬",
            v: eaten.sugar,
            max: tg.sugarMax,
            unit: "g",
            color: "var(--purple)",
          },
          {
            k: t("Saturated fat"),
            icon: "🧈",
            v: eaten.satFat,
            max: tg.satFatMax,
            unit: "g",
            color: "var(--yellow)",
          },
          {
            k: t("Sodium"),
            icon: "🧂",
            v: eaten.sodium,
            max: tg.sodiumMax,
            unit: "mg",
            color: "var(--teal)",
          },
          {
            k: t("Fibre (goal)"),
            icon: "🌾",
            v: eaten.fiber,
            max: tg.fiber,
            unit: "g",
            color: "var(--green)",
          },
        ].map((x, i) => (
          <div key={x.k} style={{ marginTop: i ? 12 : 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                marginBottom: 6,
              }}
            >
              <span>
                <span className="chip-emoji" data-emoji={x.icon} aria-hidden />
                {x.k}
              </span>
              <span className="muted tabular">
                {round(x.v)} / {x.max} {x.unit}
              </span>
            </div>
            <Bar value={x.v} max={x.max} color={x.color} />
          </div>
        ))}
      </div>

      {meals.map((m) => {
        const list = entries.filter((e) => e.meal === m);
        const kcal = list.reduce((a, e) => a + e.nutrients.kcal, 0);
        return (
          <div key={m}>
            <div className="section-header">
              <span className="meal-head">
                <MealIcon meal={m} ramadan={profile.fasting === "ramadan"} />
                {mealLabel(m)}
                {list.length > 0 && ` · ${round(kcal)} kcal`}
              </span>
              <span style={{ display: "flex", gap: 14 }}>
                {list.length === 0 &&
                  log.some((e) => e.date === yesterday && e.meal === m) && (
                    <button
                      onClick={() => copyYesterday(m)}
                      aria-label={t("Copy yesterday's {meal}", {
                        meal: mealLabel(m),
                      })}
                    >
                      {t("Copy yesterday")}
                    </button>
                  )}
                <button
                  onClick={() => go("food")}
                  aria-label={t("Add to {meal}", { meal: mealLabel(m) })}
                >
                  {t("Add")}
                </button>
              </span>
            </div>
            <div className="group">
              {list.length === 0 ? (
                <div className="row muted" style={{ fontSize: 15 }}>
                  {t("Nothing logged yet")}
                </div>
              ) : (
                list.map((e) => <LogRow key={e.id} e={e} onEdit={() => setEditing(e)} />)
              )}
            </div>
          </div>
        );
      })}

      <div className="section-header">
        {t("Workouts")}
        <button onClick={() => go("train")}>
          {active ? t("Open") : t("Clock in")}
        </button>
      </div>
      <div className="group">
        {todaysSessions.length === 0 ? (
          <div className="row muted" style={{ fontSize: 15 }}>
            {t("No workouts today")}
          </div>
        ) : (
          todaysSessions.map((s) => (
            <button
              className="row with-icon"
              key={s.id}
              onClick={() => go("train")}
            >
              <div
                className="icon-tile"
                style={{
                  background: s.endedAt ? "var(--orange)" : "var(--green)",
                }}
              >
                <Dumbbell size={17} />
              </div>
              <div className="row-main">
                <div className="row-title">{exName(s.title)}</div>
                <div className="row-sub">
                  {formatDuration(sessionMinutes(s, now))} ·{" "}
                  {plural(s.exercises.length, "exercise")}{" "}
                  {s.endedAt ? "" : `· ${t("in progress")}`}
                </div>
              </div>
              <span className="row-value">
                {round(
                  s.endedAt ? s.kcal : sessionKcal(s, profile.weightKg, now),
                )}{" "}
                kcal
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
