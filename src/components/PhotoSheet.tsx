import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Info, Sparkles, Trash2 } from "lucide-react";
import { mealOptions, analyzePhoto, defaultMeal, prepareImage, type PhotoAnalysis, type PhotoItem } from "../lib/api";
import { isNative, pickNativePhoto } from "../lib/platform";
import { healthReport, round, suitability, sum, targets } from "../lib/nutrition";
import { actions, todayKey, useStore } from "../lib/store";
import type { MealType, Nutrients } from "../lib/types";
import { useTodayTotals } from "./FoodSheet";
import { t, useLanguage } from "../i18n";
import { AvoidCard, HealthCard, Segmented, Sheet, SuitabilityCard, haptic, showToast } from "./ui";
import { conflicts, nameTags, withConflicts } from "../lib/allergens";

interface Editable extends PhotoItem {
  baseGrams: number;
}

function itemNutrients(i: Editable): Nutrients {
  const f = i.baseGrams > 0 ? i.grams / i.baseGrams : 0;
  return {
    kcal: i.calories * f,
    protein: i.protein * f,
    carbs: i.carbs * f,
    fat: i.fat * f,
    fiber: i.fiber * f,
    sugar: i.sugar * f,
    // The vision model doesn't estimate these; leave at 0 rather than guess.
    satFat: 0,
    sodium: 0,
  };
}

/** `start="library"` opens the phone's photo picker straight away (e.g. from a "Photo library" button). */
export function PhotoSheet({ open, onClose, start }: { open: boolean; onClose: () => void; start?: "camera" | "library" }) {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const eaten = useTodayTotals();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [img, setImg] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PhotoAnalysis | null>(null);
  const [items, setItems] = useState<Editable[]>([]);
  const [meal, setMeal] = useState<MealType>(defaultMeal());

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setImg(null);
      setHint("");
      setResult(null);
      setItems([]);
      setError(null);
      setBusy(false);
      setMeal(defaultMeal());
    }
  }, [open]);

  // Opened from a "Photo library" or "Camera" button: go straight to the picker, once per opening.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!open) {
      autoStarted.current = false;
      return;
    }
    if (start && !autoStarted.current) {
      autoStarted.current = true;
      pick(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, start]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      setImg(await prepareImage(file));
    } catch {
      setError(t("Couldn't read that image. Try a JPEG or PNG."));
    }
  };

  const pick = async (source: "camera" | "library") => {
    if (!isNative) {
      (source === "camera" ? cameraRef : fileRef).current?.click();
      return;
    }
    try {
      const file = await pickNativePhoto(source);
      if (file) await onFile(file);
    } catch {
      setError(source === "camera" ? t("Couldn't open the camera. Check camera access in Settings.") : t("Couldn't open your photos. Check photo access in Settings."));
    }
  };

  const run = async () => {
    if (!img) return;
    setBusy(true);
    setError(null);
    abortRef.current = new AbortController();
    try {
      const r = await analyzePhoto(img.base64, img.mediaType, hint, abortRef.current.signal);
      setResult(r);
      setItems(r.items.map((i) => ({ ...i, grams: Math.round(i.grams), baseGrams: i.grams })));
      haptic("success");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const total = sum(items.map(itemNutrients));
  const photoConflicts = result ? conflicts(new Set(items.flatMap((i) => [...nameTags(`${i.name} ${result.mealName}`)])), profile) : [];
  const tg = targets(profile);

  const addAll = () => {
    actions.addLog(
      items
        .filter((i) => i.grams > 0)
        .map((i) => ({ date: todayKey(), meal, name: i.name, grams: i.grams, nutrients: itemNutrients(i), source: "photo" as const })),
    );
    haptic();
    showToast(t("Logged {name} · {kcal} kcal", { name: result?.mealName ?? t("meal"), kcal: round(total.kcal) }));
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("Scan a meal")}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {!img && (
        <>
          <p className="subtitle" style={{ marginTop: 4 }}>
            {t("Take a photo of your plate. AI identifies each food, estimates the portion and works out the calories.")}
          </p>
          <div className="tiles">
            <button className="tile" onClick={() => pick("camera")}>
              <div className="icon-tile" style={{ background: "var(--blue)" }}>
                <Camera size={18} />
              </div>
              <div>
                <div className="tile-title">{t("Take photo")}</div>
                <div className="tile-sub">{t("Use the camera")}</div>
              </div>
            </button>
            <button className="tile" onClick={() => pick("library")}>
              <div className="icon-tile" style={{ background: "var(--purple)" }}>
                <ImagePlus size={18} />
              </div>
              <div>
                <div className="tile-title">{t("Choose photo")}</div>
                <div className="tile-sub">{t("From your library")}</div>
              </div>
            </button>
          </div>
          <div className="disclaimer">
            <Info size={14} />
            <span>{t("Tip: shoot from above in good light with the whole plate in frame for the best estimate.")}</span>
          </div>
        </>
      )}

      {img && (
        <>
          <div className={busy ? "scan-overlay" : undefined} style={{ borderRadius: 22, overflow: "hidden" }}>
            <img src={img.preview} alt={t("Your meal")} className="photo-preview" />
          </div>

          {!result && (
            <>
              <div className="spacer" />
              <input
                className="text-input"
                placeholder={t("Optional: add details (e.g. 'less rice, no sambal')")}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                maxLength={300}
              />
              <div className="spacer" />
              <div className="btn-row">
                <button className="btn secondary" onClick={() => setImg(null)} disabled={busy}>
                  {t("Retake")}
                </button>
                <button className="btn" onClick={run} disabled={busy}>
                  {busy ? <div className="spinner" style={{ borderTopColor: "#fff" }} /> : <Sparkles size={18} />}
                  {busy ? t("Analysing…") : t("Analyse")}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {error && (
        <div className="verdict" style={{ marginTop: 12, background: "color-mix(in srgb, var(--red) 12%, var(--bg-elev))", color: "var(--red)" }}>
          {error}
        </div>
      )}

      {result && !result.isFood && (
        <div className="empty">{t("That doesn't look like food. Try another photo, or search for the food instead.")}</div>
      )}

      {result && result.isFood && (
        <>
          <h2 className="h2">{result.mealName}</h2>
          <div className="card">
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="big-number">{round(total.kcal)}</span>
              <span className="muted">{t("kcal total")}</span>
            </div>
            <div className="row-sub" style={{ marginTop: 6 }}>
              P {round(total.protein)} g · C {round(total.carbs)} g · F {round(total.fat)} g
            </div>
          </div>

          <div className="section-header">{t("Detected foods — adjust the grams if needed")}</div>
          <div className="group">
            {items.map((it, idx) => {
              const n = itemNutrients(it);
              return (
                <div className="row" key={idx}>
                  <div className="row-main">
                    <div className="row-title">{it.name}</div>
                    <div className="row-sub">
                      {round(n.kcal)} kcal · P {round(n.protein)} · C {round(n.carbs)} · F {round(n.fat)}
                      {it.confidence !== "high" && ` · ${it.confidence === "low" ? t("low confidence") : t("medium confidence")}`}
                    </div>
                  </div>
                  <input
                    className="num-input"
                    inputMode="numeric"
                    value={it.grams}
                    aria-label={t("{name} grams", { name: it.name })}
                    onChange={(e) => {
                      const g = Number(e.target.value.replace(/\D/g, "")) || 0;
                      setItems((list) => list.map((x, j) => (j === idx ? { ...x, grams: g } : x)));
                    }}
                  />
                  <span className="muted" style={{ fontSize: 14 }}>
                    g
                  </span>
                  <button className="icon-btn" aria-label={t("Remove {name}", { name: it.name })} onClick={() => setItems((l) => l.filter((_, j) => j !== idx))}>
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          {result.notes && <p className="footnote">{result.notes}</p>}

          <div className="section-header">{t("Is it good for me?")}</div>
          <AvoidCard conflicts={photoConflicts} />
          <SuitabilityCard s={withConflicts(suitability(total, tg, eaten, profile.goal), photoConflicts)} />
          <div className="spacer" />
          <HealthCard report={healthReport(total)} />

          <div className="section-header">{t("Meal")}</div>
          <Segmented value={meal} options={mealOptions()} onChange={setMeal} />
          <div className="spacer" />
          <button className="btn" onClick={addAll} disabled={!items.length}>
            {items.length === 1 ? t("Log {n} item", { n: 1 }) : t("Log {n} items", { n: items.length })}
          </button>
          <div className="disclaimer">
            <Info size={14} />
            <span>{t("Photo estimates can be off by 20–30%, especially for oil and sauces. Weigh food when accuracy matters.")}</span>
          </div>
        </>
      )}
    </Sheet>
  );
}
