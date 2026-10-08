import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Flame, Plus, Search } from "lucide-react";
import { CARDIO_GROUPS, EXERCISES, STRENGTH_GROUPS } from "../data/exercises";
import { kcalFor } from "../lib/fitness";
import { round } from "../lib/nutrition";
import { useStore } from "../lib/store";
import type { Exercise } from "../lib/types";
import { Segmented, Sheet, Stepper } from "./ui";

export function ExerciseLibrary({
  open,
  onClose,
  onPick,
  pickLabel = "Add to workout",
}: {
  open: boolean;
  onClose: () => void;
  onPick?: (ex: Exercise, minutes?: number) => void;
  pickLabel?: string;
}) {
  const weight = useStore((s) => s.profile.weightKg);
  const [kind, setKind] = useState<"strength" | "cardio">("strength");
  const [group, setGroup] = useState("All");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    if (open) {
      setQ("");
      setDetail(null);
    }
  }, [open]);
  useEffect(() => setGroup("All"), [kind]);

  const groups = ["All", ...(kind === "strength" ? STRENGTH_GROUPS : CARDIO_GROUPS)];
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return EXERCISES.filter(
      (e) =>
        (term ? true : e.kind === kind) &&
        (term || group === "All" || e.category === group) &&
        (!term || `${e.name} ${e.category} ${e.aliases ?? ""} ${e.muscles?.join(" ") ?? ""} ${e.equipment ?? ""}`.toLowerCase().includes(term)),
    );
  }, [kind, group, q]);

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Exercises">
        <div className="search">
          <Search size={17} />
          <input placeholder={`Search ${EXERCISES.length} exercises & sports`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {!q && (
          <>
            <div style={{ marginTop: 12 }}>
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  { value: "strength", label: "Strength" },
                  { value: "cardio", label: "Cardio & Sports" },
                ]}
              />
            </div>
            <div className="chips" style={{ marginTop: 12 }}>
              {groups.map((g) => (
                <button key={g} className={`chip ${g === group ? "active" : ""}`} onClick={() => setGroup(g)}>
                  {g}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="group" style={{ marginTop: 12 }}>
          {list.map((e) => (
            <button
              className="row"
              key={e.id}
              onClick={() => {
                setMinutes(30);
                setDetail(e);
              }}
            >
              <div className="row-main">
                <div className="row-title">{e.name}</div>
                <div className="row-sub">
                  {e.kind === "strength" ? `${e.muscles?.join(", ")} · ${e.equipment}` : `${e.category} · ${round(kcalFor(e.met, weight, 30))} kcal / 30 min`}
                </div>
              </div>
              <ChevronRight size={16} className="chev" />
            </button>
          ))}
          {list.length === 0 && <div className="empty">No exercises match.</div>}
        </div>
      </Sheet>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.category}>
        {detail && (
          <>
            <h2 className="h2" style={{ marginTop: 4 }}>
              {detail.name}
            </h2>
            <div className="card">
              <div className="stat-grid">
                <div className="stat">
                  <span className="stat-label">Intensity</span>
                  <span className="stat-value">
                    {detail.met}
                    <small>MET</small>
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">
                    <Flame size={13} color="var(--orange)" /> Per 10 min
                  </span>
                  <span className="stat-value">
                    {round(kcalFor(detail.met, weight, 10))}
                    <small>kcal</small>
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Per hour</span>
                  <span className="stat-value">
                    {round(kcalFor(detail.met, weight, 60))}
                    <small>kcal</small>
                  </span>
                </div>
              </div>
            </div>
            {detail.kind === "strength" && (
              <div className="group" style={{ marginTop: 12 }}>
                <div className="row">
                  <div className="row-main">Muscles</div>
                  <div className="row-value" style={{ whiteSpace: "normal", textAlign: "right" }}>
                    {detail.muscles?.join(", ")}
                  </div>
                </div>
                <div className="row">
                  <div className="row-main">Equipment</div>
                  <div className="row-value">{detail.equipment}</div>
                </div>
                {detail.tip && (
                  <div className="row">
                    <div className="row-main" style={{ fontSize: 15 }}>
                      <div className="muted" style={{ fontSize: 13, marginBottom: 2 }}>
                        Form cue
                      </div>
                      {detail.tip}
                    </div>
                  </div>
                )}
              </div>
            )}
            {detail.kind === "cardio" && onPick && (
              <div className="group" style={{ marginTop: 12 }}>
                <div className="row">
                  <div className="row-main">
                    Duration
                    <div className="row-sub">≈ {round(kcalFor(detail.met, weight, minutes))} kcal</div>
                  </div>
                  <Stepper value={minutes} step={5} min={5} max={600} onChange={setMinutes} format={(v) => `${v} min`} />
                </div>
              </div>
            )}
            <p className="footnote">Calories = MET × your weight ({weight} kg) × hours, using the Compendium of Physical Activities.</p>
            {onPick && (
              <>
                <div className="spacer" />
                <button
                  className="btn"
                  onClick={() => {
                    onPick(detail, detail.kind === "cardio" ? minutes : undefined);
                    setDetail(null);
                    onClose();
                  }}
                >
                  <Plus size={18} /> {pickLabel}
                </button>
              </>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
