import { AlertTriangle, CalendarClock, ClipboardList, Info, ListChecks } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "../i18n";
import type { LateAdvice, LateSignal } from "../lib/cycle";

/** What a late or missed period can mean and what to do, using the person's own logs where they help. */
export function LateAdviceSheetBody({ advice, onStarted }: { advice: LateAdvice; onStarted: () => void }) {
  const { level, daysLate, sinceLast } = advice;
  const headline = {
    few: t("{n} days late: usually nothing to worry about", { n: daysLate }),
    late: t("{n} days late", { n: daysLate }),
    long: t("More than 2 weeks late"),
    missed: t("No period for {n} days", { n: sinceLast }),
  }[level];
  const summary = {
    few: t("Cycles often move by up to a week from month to month. Keep an eye on it and mark the day it starts."),
    late: t("A period counts as late after 5 days. Most often it's stress, sleep, or a change in eating or training, but it's worth ruling out pregnancy."),
    long: t("If a pregnancy test is negative and your period still hasn't come, it's a good time to see a doctor or clinic."),
    missed: t("Three months without a period, when you're not pregnant, breastfeeding or on contraception that stops periods, should be checked by a doctor. The cause is often easy to treat."),
  }[level];

  const todo = [
    t("Already started? Tap “It started today”, or mark the day in the period calendar, so predictions stay right."),
    level === "few"
      ? t("If there's any chance you could be pregnant, a home pregnancy test is accurate from the day your period was due.")
      : t("If there's any chance you could be pregnant, take a home pregnancy test. If it's negative and your period still hasn't come, test again in 3–5 days."),
    t("Eat enough: avoid big calorie cuts and keep some carbs in your meals, especially on training days."),
    t("Sleep 7–9 hours and ease off where you can: stress hormones can delay ovulation."),
    ...(level === "long" || level === "missed" ? [t("Book a doctor or clinic visit and bring the dates from your period calendar.")] : []),
  ];

  const reasons = [
    t("Stress, illness or poor sleep"),
    t("Travel, time-zone changes or night shifts"),
    t("Starting, stopping or missing hormonal contraception"),
    t("Breastfeeding"),
    t("PCOS or thyroid problems"),
    ...(advice.over40 ? [t("Perimenopause (from about 40)")] : []),
    t("Some medicines"),
  ];

  const urgent = [
    t("Severe pain low in your belly or on one side"),
    t("Very heavy bleeding (soaking a pad every hour) or feeling faint"),
    t("A positive pregnancy test with pain or bleeding"),
    t("Fever, or you feel very unwell"),
  ];

  return (
    <div data-testid="late-advice">
      <div className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div className="icon-tile" style={{ background: "var(--pink)" }}>
            <CalendarClock size={17} />
          </div>
          <div className="row-main">
            <div style={{ fontWeight: 700 }}>{headline}</div>
            <div className="row-sub" style={{ whiteSpace: "normal" }}>
              {summary}
            </div>
          </div>
        </div>
        <button className="btn small secondary" style={{ marginTop: 12 }} onClick={onStarted}>
          {t("It started today")}
        </button>
      </div>

      <Section icon={<ListChecks size={17} />} color="var(--green)" title={t("What to do now")} items={todo} />
      {advice.signals.length > 0 && (
        <Section icon={<ClipboardList size={17} />} color="var(--orange)" title={t("From your logs")} items={advice.signals.map(signalText)} testId="late-signals" />
      )}
      <Section icon={<Info size={17} />} color="var(--blue)" title={t("Other common reasons")} items={reasons} />
      <Section icon={<AlertTriangle size={17} />} color="var(--red)" title={t("See a doctor straight away if you have")} items={urgent} />

      <div className="disclaimer">{t("Estimates from the dates you log. Not medical advice; a doctor can tell you what's going on.")}</div>
    </div>
  );
}

function signalText(s: LateSignal): string {
  switch (s.kind) {
    case "lowIntake":
      return t("On the {days} days you logged in the last 4 weeks you ate about {kcal} kcal a day, well under your {target} kcal target. Eating too little is one of the most common reasons a period is late.", s);
    case "weightLoss":
      return t("You've lost {kg} kg in the last 2 months. Losing weight quickly can delay a period.", s);
    case "training":
      return t("{sessions} workouts in the last 4 weeks. Hard training without enough food can pause your cycle: try a lighter week and eat back what you burn.", s);
    case "underweight":
      return t("Your BMI is {bmi}, under 18.5. A low body weight can stop periods.", s);
    case "fasting":
      return t("Fasting changes when and how much you eat, which can shift your cycle.");
    case "irregular":
      return t("Your recent cycles ran from {min} to {max} days, so predictions are rough. Cycles this irregular are worth mentioning to a doctor.", s);
  }
}

function Section({ icon, color, title, items, testId }: { icon: ReactNode; color: string; title: string; items: string[]; testId?: string }) {
  return (
    <div className="card" data-testid={testId}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div className="icon-tile" style={{ background: color }}>
          {icon}
        </div>
        <div className="row-main">
          <div style={{ fontWeight: 700 }}>{title}</div>
          <ul className="row-sub" style={{ whiteSpace: "normal", paddingLeft: 18, margin: "6px 0 0" }}>
            {items.map((p) => (
              <li key={p} style={{ marginTop: 4 }}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
