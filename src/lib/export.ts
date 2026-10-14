import { t } from "../i18n";
import { formatDuration, sessionMinutes, sessionVolume } from "./fitness";
import { round, sum, targets } from "./nutrition";
import { addDays } from "./progress";
import { personalRecords } from "./records";
import { parseState, type AppState } from "./store";
import type { Symptom, WorkoutSession } from "./types";
import { cycleOf, periodLength } from "./cycle";
import { healthCheck, pastCycles, type HealthFlag } from "./cycleCare";

// ── CSV ──────────────────────────────────────────────────

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  // Quote anything with commas, quotes or line breaks; neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const table = (head: string[], rows: unknown[][]) => [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

/** All the person's data as one CSV file with a section per table. */
export function toCsv(s: AppState): string {
  const food = table(
    ["date", "meal", "food", "grams", "kcal", "protein_g", "carbs_g", "fat_g", "fibre_g", "sugar_g", "sat_fat_g", "sodium_mg", "note"],
    [...s.log]
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
      .map((e) => [
        e.date,
        e.meal,
        e.name,
        round(e.grams),
        round(e.nutrients.kcal),
        round(e.nutrients.protein, 1),
        round(e.nutrients.carbs, 1),
        round(e.nutrients.fat, 1),
        round(e.nutrients.fiber, 1),
        round(e.nutrients.sugar, 1),
        round(e.nutrients.satFat, 1),
        round(e.nutrients.sodium),
        e.note ?? "",
      ]),
  );
  const sets = table(
    ["date", "workout", "exercise", "set", "weight_kg", "reps", "minutes", "workout_kcal", "workout_minutes"],
    s.sessions
      .filter((x) => x.endedAt)
      .sort((a, b) => a.startedAt - b.startedAt)
      .flatMap((w) =>
        w.exercises.flatMap((e) =>
          e.kind === "cardio"
            ? [[w.date, w.title, e.name, "", "", "", e.minutes ?? "", w.kcal, round(sessionMinutes(w))]]
            : (e.sets ?? []).filter((x) => x.done).map((x, i) => [w.date, w.title, e.name, i + 1, x.weightKg, x.reps, "", w.kcal, round(sessionMinutes(w))]),
        ),
      ),
  );
  const weights = table(["date", "weight_kg"], s.weights.map((w) => [w.date, w.kg]));
  const days = table(["date", "water_ml"], s.days.map((d) => [d.id, d.waterMl]));
  const parts = [`# Food log`, food, ``, `# Workouts`, sets, ``, `# Weight`, weights, ``, `# Water`, days];
  if (s.periods?.length) parts.push(``, `# Periods`, table(["first_day", "last_day"], s.periods.map((p) => [p.date, p.end])));
  const cycleDays = s.days.filter((d) => d.flow || d.symptoms?.length || d.pill || d.fastMissed || d.qada);
  if (cycleDays.length)
    parts.push(``, `# Cycle days`, table(["date", "flow", "symptoms", "pill_taken", "fast_missed", "fast_replaced"], cycleDays.map((d) => [d.id, d.flow, (d.symptoms ?? []).join(" "), d.pill ? "yes" : "", d.fastMissed ? "yes" : "", d.qada ? "yes" : ""])));
  return parts.join("\r\n");
}

// ── PDF report ───────────────────────────────────────────

/** A 30-day summary for a coach or doctor: targets, daily averages, weight, workouts and records. */
const SYMPTOM_EN: Record<Symptom, string> = {
  cramps: "cramps",
  headache: "headache",
  bloating: "bloating",
  breasts: "tender breasts",
  backPain: "back pain",
  acne: "acne",
  tired: "tired",
  lowMood: "low mood",
  cravings: "cravings",
  nausea: "nausea",
};
const FLAG_EN: Record<HealthFlag, string> = {
  short: "Cycles shorter than 21 days, more than once",
  long: "Cycles longer than 35 days, more than once",
  irregular: "Cycle length varies by 8 days or more",
  longPeriods: "Periods lasting more than 7 days",
  heavy: "Several days of heavy flow",
  between: "Bleeding or spotting between periods",
  missed: "No period for 90 days or more",
};

export async function toPdf(s: AppState, today: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;
  const p = s.profile;
  const tg = targets(p);
  const from = addDays(today, -29);
  // The built-in PDF fonts only cover Latin text; strip what they can't draw.
  const latin = (x: string) => x.replace(/[^\u0000-ɏ–—‘-”·]/g, "").replace(/\s+/g, " ").trim();

  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (txt: string) => {
    ensure(40);
    y += 14;
    doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(20);
    doc.text(latin(txt), M, y);
    y += 8;
    doc.setDrawColor(220).line(M, y, W - M, y);
    y += 16;
  };
  const line = (label: string, value: string) => {
    ensure(18);
    doc.setFont("helvetica", "normal").setFontSize(10.5).setTextColor(90);
    doc.text(latin(label), M, y);
    doc.setTextColor(20).text(latin(value), W - M, y, { align: "right" });
    y += 17;
  };

  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(20);
  doc.text("W · 30-day report", M, y);
  y += 20;
  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(110);
  doc.text(latin(`${p.name ? `${p.name} · ` : ""}${from} to ${today}`), M, y);
  y += 10;

  heading("Profile and targets");
  line("Sex, age", `${p.sex}, ${p.age}`);
  line("Height, weight", `${p.heightCm} cm, ${p.weightKg} kg (BMI ${round(p.weightKg / (p.heightCm / 100) ** 2, 1)})`);
  line("Goal", { lose: "Lose fat", maintain: "Maintain", gain: "Build muscle" }[p.goal]);
  line("Daily target", `${tg.kcal} kcal · protein ${tg.protein} g · carbs ${tg.carbs} g · fat ${tg.fat} g`);
  if (p.diet !== "anything" || p.allergies.length) line("Diet", [p.diet, ...p.allergies].join(", "));

  const days = [...Array(30).keys()].map((i) => addDays(from, i));
  const logged = days.map((d) => sum(s.log.filter((e) => e.date === d).map((e) => e.nutrients))).filter((n) => n.kcal > 0);
  heading("Food (days with entries)");
  if (logged.length) {
    const avg = (k: keyof (typeof logged)[number]) => round(logged.reduce((a, n) => a + n[k], 0) / logged.length);
    line("Days logged", `${logged.length} of 30`);
    line("Average calories", `${avg("kcal")} kcal (target ${tg.kcal})`);
    line("Average protein / carbs / fat", `${avg("protein")} g / ${avg("carbs")} g / ${avg("fat")} g`);
    line("Average sugar / sodium", `${avg("sugar")} g / ${avg("sodium")} mg`);
    line("Average fibre", `${avg("fiber")} g (goal ${tg.fiber} g)`);
  } else line("Days logged", "None in the last 30 days");

  const ws = s.weights.filter((w) => w.date >= from);
  heading("Weight");
  if (ws.length) {
    line("First", `${ws[0].kg} kg on ${ws[0].date}`);
    line("Latest", `${ws[ws.length - 1].kg} kg on ${ws[ws.length - 1].date}`);
    line("Change", `${round(ws[ws.length - 1].kg - ws[0].kg, 1)} kg`);
  } else line("Weigh-ins", "None in the last 30 days");

  const wk = s.sessions.filter((x) => x.endedAt && x.date >= from);
  heading("Training");
  line("Workouts", `${wk.length} · ${round(wk.reduce((a, x) => a + sessionMinutes(x), 0) / 60, 1)} h · ${round(wk.reduce((a, x) => a + x.kcal, 0))} kcal`);
  for (const x of wk.slice(0, 20)) line(`${x.date} · ${x.title}`, `${formatDuration(sessionMinutes(x))} · ${x.kcal} kcal`);

  const prs = personalRecords(s.sessions).slice(0, 12);
  if (prs.length) {
    heading("Personal records (estimated 1-rep max)");
    for (const r of prs) line(r.name, `${r.weightKg} kg × ${r.reps} · e1RM ${round(r.e1rm)} kg · ${r.date}`);
  }

  // Cycle (only when tracked): for a doctor's visit.
  const cyc = cycleOf(p);
  if (cyc.on && s.periods.length) {
    const cycles = pastCycles(s.periods, cyc, s.days);
    const check = healthCheck(cycles, s.days, s.periods, cyc, today);
    heading("Menstrual cycle");
    if (check.average !== null) line("Average cycle", `${check.average} days (range ${check.shortest}-${check.longest})`);
    line("Regular", check.regular === null ? "Not enough cycles yet" : check.regular ? "Yes (varies by less than 8 days)" : "No (varies by 8 days or more)");
    line("Usual period length", `${periodLength(s.periods, cyc.periodDays)} days`);
    for (const c of cycles.slice(-6).reverse())
      line(`Period from ${c.start}`, `${c.bleeding} days bleeding${c.heavyDays ? `, ${c.heavyDays} heavy` : ""} · ${c.length !== null ? `cycle ${c.length} days` : "current cycle"}`);
    const from90 = addDays(today, -89);
    const counts = new Map<string, number>();
    for (const d of s.days) if (d.id >= from90) for (const x of d.symptoms ?? []) counts.set(x, (counts.get(x) ?? 0) + 1);
    if (counts.size)
      line(
        "Symptoms logged (90 days)",
        [...counts]
          .sort((a, b) => b[1] - a[1])
          .map(([k, n]) => `${SYMPTOM_EN[k as Symptom]} ${n}`)
          .join(", "),
      );
    if (cyc.pill?.on) line("Birth-control pill", `${cyc.pill.active} active + ${cyc.pill.breakDays} break/placebo days`);
    for (const f of check.flags) line("To discuss", FLAG_EN[f]);
  }

  ensure(40);
  y += 18;
  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(130);
  doc.text("Generated by the W app. Nutrition values are estimates. Not medical advice.", M, y);
  return doc.output("blob");
}

// ── Workout share card ───────────────────────────────────

/** A portrait image summarising a workout, for sharing to chats and stories. */
export async function workoutCard(w: WorkoutSession, dark = false): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, dark ? "#1c1c1e" : "#ff9f0a");
  bg.addColorStop(1, dark ? "#000000" : "#ff375f");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const font = (size: number, weight = 600) => `${weight} ${size}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Noto Sans", sans-serif`;

  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = font(40, 600);
  g.fillText(new Date(w.startedAt).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }).toUpperCase(), 80, 140);
  g.fillStyle = "#fff";
  g.font = font(96, 800);
  g.fillText(w.title.slice(0, 22), 80, 250);

  const stats: [string, string][] = [
    [t("Time"), formatDuration(sessionMinutes(w))],
    [t("Burned"), `${w.kcal} kcal`],
    [t("Volume"), `${round(sessionVolume(w)).toLocaleString()} kg`],
  ];
  stats.forEach(([k, v], i) => {
    const x = 80 + i * 320;
    g.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(g, x, 320, 290, 190, 36);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = font(34, 600);
    g.fillText(k, x + 32, 380);
    g.fillStyle = "#fff";
    g.font = font(60, 800);
    g.fillText(v, x + 32, 465);
  });

  let y = 620;
  g.font = font(42, 700);
  for (const e of w.exercises.slice(0, 7)) {
    const done = (e.sets ?? []).filter((x) => x.done);
    const best = done.reduce((a, x) => (x.weightKg > a.weightKg ? x : a), { weightKg: 0, reps: 0, done: true });
    const detail = e.kind === "cardio" ? `${e.minutes ?? 0} min` : done.length ? `${done.length} × ${best.weightKg ? `${best.weightKg} kg × ` : ""}${best.reps}` : "";
    g.fillStyle = "#fff";
    g.font = font(42, 600);
    g.fillText(e.name.length > 30 ? `${e.name.slice(0, 29)}…` : e.name, 80, y);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.textAlign = "right";
    g.fillText(detail, W - 80, y);
    g.textAlign = "left";
    y += 84;
  }
  if (w.exercises.length > 7) {
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillText(t("+ {n} more", { n: w.exercises.length - 7 }), 80, y);
  }

  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = font(38, 700);
  g.fillText("W", 80, H - 90);
  g.font = font(32, 500);
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.textAlign = "right";
  g.fillText(t("Tracked with W"), W - 80, H - 90);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the image"))), "image/png"));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}


// ── Backup file ──────────────────────────────────────────
// Everything (every person in the household too) in one file, to move to a new phone or keep safe.

const BACKUP_KIND = "w-backup";

export function toBackup(s: AppState): string {
  return JSON.stringify({ kind: BACKUP_KIND, version: 1, savedAt: new Date().toISOString(), state: s });
}

/** The saved data from a backup file, or null if it isn't one. */
export function fromBackup(text: string): AppState | null {
  try {
    const file = JSON.parse(text) as { kind?: string; state?: AppState };
    if (file?.kind !== BACKUP_KIND || !file.state?.profile) return null;
    return parseState(JSON.stringify(file.state));
  } catch {
    return null;
  }
}
