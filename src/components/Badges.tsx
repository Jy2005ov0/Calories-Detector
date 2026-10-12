import { useMemo, useState } from "react";
import { Award, ChevronRight, Flag, Medal } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { CHALLENGES, badges, challengeProgress, type Data } from "../lib/badges";
import { targets } from "../lib/nutrition";
import { waterGoalMl } from "../lib/progress";
import { DEFAULT_STEP_GOAL } from "../lib/steps";
import { actions, useStore, useTodayKey } from "../lib/store";
import { Bar, Sheet, haptic, showToast } from "./ui";

function useData(): Data {
  const today = useTodayKey();
  const log = useStore((s) => s.log);
  const days = useStore((s) => s.days);
  const sessions = useStore((s) => s.sessions);
  const weights = useStore((s) => s.weights);
  const profile = useStore((s) => s.profile);
  return useMemo(
    () => ({ log, days, sessions, weights, tg: targets(profile), waterGoalMl: waterGoalMl(profile), stepGoal: profile.stepGoal || DEFAULT_STEP_GOAL, today }),
    [log, days, sessions, weights, profile, today],
  );
}

/** Badges earned so far and challenges to take on. */
export function BadgesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLanguage();
  const d = useData();
  const joined = useStore((s) => s.challenges);
  const list = useMemo(() => badges(d), [d]);
  const earned = list.filter((b) => b.earned).length;
  return (
    <Sheet open={open} onClose={onClose} title={t("Badges & challenges")}>
      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Flag size={14} /> {t("Challenges")}
        </span>
      </div>
      <div className="group" data-testid="challenges">
        {CHALLENGES.map((def) => {
          const c = joined.find((j) => j.id === def.id);
          const p = c ? challengeProgress(c, d) : null;
          return (
            <div className="row challenge" key={def.id}>
              <div className="row-main">
                <div className="row-title">{t(def.title)}</div>
                <div className="row-sub" style={{ whiteSpace: "normal" }}>
                  {!p
                    ? t(def.detail)
                    : p.status === "complete"
                      ? t("Done! Challenge complete.")
                      : p.status === "failed"
                        ? t("Missed a day. Start again whenever you're ready.")
                        : def.days
                          ? t("Day {day} of {days} · {done} done", { day: p.day, days: def.days, done: p.done })
                          : t("{done} of {goal}", { done: p.done, goal: def.goal })}
                </div>
                {p && p.status === "active" && (
                  <div style={{ marginTop: 6 }}>
                    <Bar value={p.done} max={def.goal} color="var(--blue)" />
                  </div>
                )}
              </div>
              {!p || p.status !== "active" ? (
                <button
                  className="btn small tinted"
                  onClick={() => {
                    actions.joinChallenge(def.id);
                    haptic("success");
                    showToast(t("Challenge started: {name}", { name: t(def.title) }));
                  }}
                >
                  {p ? t("Restart") : t("Join")}
                </button>
              ) : (
                <button className="btn small secondary" onClick={() => actions.leaveChallenge(def.id)}>
                  {t("Leave")}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Medal size={14} /> {t("Badges · {n} of {total}", { n: earned, total: list.length })}
        </span>
      </div>
      <div className="badge-grid" data-testid="badges">
        {list.map((b) => (
          <div key={b.id} className={`badge-tile ${b.earned ? "earned" : ""}`} aria-label={`${t(b.title)}: ${b.earned ? t("earned") : t("{pct}% there", { pct: Math.round(b.progress * 100) })}`} role="img">
            <Award size={26} aria-hidden />
            <div className="badge-name">{t(b.title)}</div>
            <div className="badge-detail">{t(b.detail)}</div>
            {!b.earned && <Bar value={b.progress} max={1} color="var(--label-3)" />}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/** Row that opens badges and challenges, with how many badges are earned. */
export function BadgesRow() {
  useLanguage();
  const d = useData();
  const joined = useStore((s) => s.challenges);
  const earned = useMemo(() => badges(d).filter((b) => b.earned).length, [d]);
  const active = joined.filter((c) => challengeProgress(c, d).status === "active").length;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="row with-icon" onClick={() => setOpen(true)}>
        <div className="icon-tile" style={{ background: "var(--yellow)", color: "#1d1d1f" }}>
          <Award size={17} />
        </div>
        <div className="row-main">
          <div className="row-title">{t("Badges & challenges")}</div>
          <div className="row-sub">{active ? t("{n} badges · {c} challenge in progress", { n: earned, c: active }) : t("{n} badges earned", { n: earned })}</div>
        </div>
        <ChevronRight size={16} className="chev" />
      </button>
      <BadgesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
