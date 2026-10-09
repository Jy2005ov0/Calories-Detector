import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowUp, Sparkles, Trash2 } from "lucide-react";
import { LANGUAGES, t, useLanguage } from "../i18n";
import { mealLabel } from "../lib/api";
import { cycleOf, cycleStatus } from "../lib/cycle";
import { buildPlan, sessionKcal } from "../lib/fitness";
import { round, sum, targets } from "../lib/nutrition";
import { apiConfigured, apiUrl } from "../lib/platform";
import { actions, getState, uid, useStore, weekdayOf, todayKey } from "../lib/store";
import type { ChatMessage } from "../lib/types";
import { SPRING, Sheet, haptic } from "./ui";

const SUGGESTIONS = [
  "What should I eat for dinner with the calories I have left?",
  "Is nasi lemak OK for my goal?",
  "How much protein is in my day so far?",
  "Plan my meals for tomorrow",
  "I'm stuck at the same weight. What should I change?",
];

/** Everything the coach needs to know about the person and their day, as plain numbers. */
function coachContext() {
  const s = getState();
  const p = s.profile;
  const t0 = targets(p);
  const today = todayKey();
  const eatenEntries = s.log.filter((e) => e.date === today);
  const eaten = sum(eatenEntries.map((e) => e.nutrients));
  const todays = s.sessions.filter((x) => x.date === today);
  const burned = todays.reduce((a, x) => a + (x.endedAt ? x.kcal : sessionKcal(x, p.weightKg, Date.now())), 0);
  const plan = buildPlan(p, s.split);
  const planToday = plan.days.find((d) => d.weekday === weekdayOf(today));
  return {
    language: LANGUAGES.find((l) => l.value === s.language)?.label,
    now: new Date().toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" }),
    person: { name: p.name || undefined, sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: p.weightKg, goal: p.goal, activity: p.activity, experience: p.experience, trainingDaysPerWeek: p.trainingDays },
    diet: p.diet,
    allergies: p.allergies,
    fasting: p.fasting,
    menstrualCycle: (() => {
      const c = cycleStatus(cycleOf(p), s.periods ?? [], today);
      return c ? { day: c.day, phase: c.phase, nextPeriodInDays: c.daysUntil } : undefined;
    })(),
    dailyTargets: { kcal: t0.kcal, proteinG: t0.protein, carbsG: t0.carbs, fatG: t0.fat, sugarMaxG: t0.sugarMax, sodiumMaxMg: t0.sodiumMax },
    today: {
      eatenKcal: round(eaten.kcal),
      proteinG: round(eaten.protein),
      carbsG: round(eaten.carbs),
      fatG: round(eaten.fat),
      burnedKcal: round(burned),
      kcalLeft: round(t0.kcal - eaten.kcal + burned),
      foods: eatenEntries.map((e) => `${mealLabel(e.meal)}: ${e.name} ${round(e.grams)} g (${round(e.nutrients.kcal)} kcal)`),
      waterMl: s.days.find((d) => d.id === today)?.waterMl ?? 0,
      steps: s.days.find((d) => d.id === today)?.steps ?? 0,
      plannedWorkout: planToday ? `${planToday.title}: ${planToday.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(", ")}` : "rest day",
    },
    recentWorkouts: s.sessions
      .filter((x) => x.endedAt)
      .slice(0, 5)
      .map((x) => `${x.date} ${x.title} ${x.kcal} kcal`),
    recentWeights: s.weights.slice(-6).map((w) => `${w.date} ${w.kg} kg`),
  };
}

/** Light formatting for replies: paragraphs, "- " bullets and **bold**. */
function Rich({ text }: { text: string }) {
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) blocks.push(<ul key={blocks.length}>{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>);
    bullets = [];
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:[-•*]|\d+\.)\s+(.*)/);
    if (m) bullets.push(m[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

export function CoachSheet({ open, onClose, initialQuestion }: { open: boolean; onClose: () => void; initialQuestion?: string }) {
  useLanguage();
  const saved = useStore((s) => s.coach);
  const [messages, setMessages] = useState<ChatMessage[]>(saved);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) setMessages(getState().coach);
    else abort.current?.abort();
  }, [open]);

  useEffect(() => {
    if (open && initialQuestion) ask(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuestion]);

  useEffect(() => end.current?.scrollIntoView({ block: "end", behavior: "smooth" }), [messages]);

  const ask = async (question: string) => {
    const q = question.trim().slice(0, 2000);
    if (!q || busy) return;
    setInput("");
    haptic("light");
    const user: ChatMessage = { id: uid(), role: "user", text: q, at: Date.now() };
    const reply: ChatMessage = { id: uid(), role: "assistant", text: "", at: Date.now() };
    const history = [...getState().coach, user].slice(-20);
    setMessages([...history, reply]);
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    let text = "";
    try {
      if (!apiConfigured) throw new Error(t("The coach needs the app's server. Rebuild the app with VITE_API_URL set to your deployed server."));
      const res = await fetch(apiUrl("/api/coach"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, text: m.text })), context: coachContext() }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("The coach couldn't answer right now."));
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages([...history, { ...reply, text }]);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      text = text || `⚠️ ${(e as Error).message}`;
    } finally {
      setBusy(false);
      abort.current = null;
    }
    const final = [...history, { ...reply, text: text.trim() || t("The coach couldn't answer right now.") }];
    setMessages(final);
    actions.setCoach(final);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("Coach")}
      left={
        messages.length > 0 && !busy ? (
          <button
            className="icon-btn"
            aria-label={t("Clear chat")}
            onClick={() => {
              setMessages([]);
              actions.setCoach([]);
            }}
          >
            <Trash2 size={16} />
          </button>
        ) : undefined
      }
    >
      <div className="coach">
        {messages.length === 0 ? (
          <div className="coach-empty">
            <div className="icon-tile" style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, var(--indigo), var(--purple))", margin: "0 auto" }}>
              <Sparkles size={24} />
            </div>
            <p className="subtitle" style={{ textAlign: "center", margin: "12px auto 16px", maxWidth: 300 }}>
              {t("Ask about food, portions, training or habits. The coach sees your targets, today's log and your plan.")}
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="option-card pressable" style={{ margin: 0 }} onClick={() => ask(t(s))}>
                  <span className="row-main" style={{ fontSize: 15 }}>
                    {t(s)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <motion.div key={m.id} className={`bubble ${m.role}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
              {m.role === "assistant" ? m.text ? <Rich text={m.text} /> : <div className="typing" aria-label={t("Coach is typing")}><span /><span /><span /></div> : m.text}
            </motion.div>
          ))
        )}
        <div ref={end} />
      </div>
      <form className="coach-input" onSubmit={submit}>
        <textarea
          rows={1}
          value={input}
          placeholder={t("Ask the coach…")}
          aria-label={t("Message the coach")}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          maxLength={2000}
        />
        <button className="send" type="submit" disabled={!input.trim() || busy} aria-label={t("Send")}>
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </form>
      <p className="footnote" style={{ textAlign: "center", marginTop: 6 }}>
        {t("AI answers can be wrong. Not medical advice.")}
      </p>
    </Sheet>
  );
}
