import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Ruler, Trash2 } from "lucide-react";
import { locale, t, useLanguage } from "../i18n";
import { bodyFatBand, latestMeasurements, measurementChange, navyBodyFat } from "../lib/body";
import { deletePhoto, loadPhoto, savePhoto, shrinkPhoto } from "../lib/photos";
import { isNative, pickNativePhoto } from "../lib/platform";
import { actions, todayKey, uid, useStore } from "../lib/store";
import type { Measurement } from "../lib/types";
import { TrendChart } from "./Charts";
import { NumberInput, Segmented, haptic, showToast } from "./ui";

type Key = "waistCm" | "neckCm" | "hipCm" | "chestCm" | "armCm" | "thighCm";
const FIELDS: { key: Key; label: string }[] = [
  { key: "waistCm", label: "Waist" },
  { key: "neckCm", label: "Neck" },
  { key: "hipCm", label: "Hips" },
  { key: "chestCm", label: "Chest" },
  { key: "armCm", label: "Arm" },
  { key: "thighCm", label: "Thigh" },
];

const BAND_LABEL = { essential: "Very lean", athletic: "Athletic", fit: "Fit", average: "Average", high: "High" } as const;

const shortDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "numeric", month: "short" });
};

/** Tape measurements with a body-fat estimate, and progress photos with a before/after slider. */
export function BodySection() {
  useLanguage();
  const profile = useStore((s) => s.profile);
  const list = useStore((s) => s.measurements);
  const latest = useMemo(() => latestMeasurements(list), [list]);
  const [draft, setDraft] = useState<Partial<Record<Key, number>>>({});
  const [chart, setChart] = useState<Key>("waistCm");
  useEffect(() => setDraft({}), [list]);
  const value = (k: Key) => draft[k] ?? latest[k] ?? 0;
  const bf = navyBodyFat(profile, { waistCm: value("waistCm"), neckCm: value("neckCm"), hipCm: value("hipCm") });
  const changed = Object.keys(draft).length > 0;
  const save = () => {
    const entry: Omit<Measurement, "id" | "createdAt"> = { date: todayKey() };
    for (const f of FIELDS) if (draft[f.key]) entry[f.key] = draft[f.key];
    actions.logMeasurement(entry);
    haptic("success");
    showToast(t("Measurements saved"));
  };
  const points = list.filter((m) => m[chart]).map((m) => ({ date: m.date, value: m[chart]! }));
  const change = measurementChange(list, chart);
  return (
    <>
      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Ruler size={14} /> {t("Body measurements")}
        </span>
      </div>
      <div className="group">
        {FIELDS.filter((f) => f.key !== "hipCm" || profile.sex === "female" || latest.hipCm).map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`m-${f.key}`}>{t(f.label)}</label>
            <NumberInput id={`m-${f.key}`} value={value(f.key)} min={10} max={250} emptyValue={0} placeholder="–" onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v || undefined }))} />
            <span className="muted" style={{ width: 26 }}>
              cm
            </span>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <button className="btn small" disabled={!changed} onClick={save}>
        {t("Save measurements")}
      </button>
      <div className="card" style={{ marginTop: 12 }} data-testid="body-fat">
        {bf !== null ? (
          <>
            <div className="tile-title">{t("Body fat about {pct}%", { pct: bf })}</div>
            <div className="row-sub" style={{ whiteSpace: "normal" }}>
              {t(BAND_LABEL[bodyFatBand(profile.sex, bf)])} · {t("US Navy tape method, usually within 3–4% of a lab scan. Measure at the same time of day.")}
            </div>
          </>
        ) : (
          <div className="row-sub" style={{ whiteSpace: "normal" }}>
            {profile.sex === "female" ? t("Add your waist, neck and hips to estimate your body fat.") : t("Add your waist and neck to estimate your body fat.")}
          </div>
        )}
      </div>
      {list.length > 1 && (
        <div className="card" style={{ marginTop: 12 }}>
          <Segmented
            value={chart}
            onChange={setChart}
            ariaLabel={t("Measurement")}
            options={FIELDS.filter((f) => list.some((m) => m[f.key])).slice(0, 4).map((f) => ({ value: f.key, label: t(f.label) }))}
          />
          <div style={{ marginTop: 10 }}>
            <TrendChart points={points} unit="cm" color="var(--purple)" label={t(FIELDS.find((f) => f.key === chart)!.label)} />
          </div>
          {change !== null && (
            <div className="row-sub">
              {change === 0 ? t("No change since you started.") : t("{sign}{cm} cm since {date}", { sign: change > 0 ? "+" : "", cm: change, date: shortDate(points[0]?.date ?? todayKey()) })}
            </div>
          )}
        </div>
      )}
      {list.length > 0 && (
        <div className="group" style={{ marginTop: 10 }}>
          {[...list]
            .reverse()
            .slice(0, 4)
            .map((m) => (
              <div className="row" key={m.id}>
                <div className="row-main">
                  <div className="row-title">{shortDate(m.date)}</div>
                  <div className="row-sub">
                    {FIELDS.filter((f) => m[f.key])
                      .map((f) => `${t(f.label)} ${m[f.key]}`)
                      .join(" · ")}
                  </div>
                </div>
                <button className="icon-btn" aria-label={t("Delete measurements from {date}", { date: shortDate(m.date) })} onClick={() => actions.removeMeasurement(m.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
        </div>
      )}
      <ProgressPhotos />
    </>
  );
}

function useStoredPhoto(id: string | undefined) {
  const [src, setSrc] = useState<string | undefined>();
  useEffect(() => {
    let alive = true;
    setSrc(undefined);
    if (id) loadPhoto(id).then((d) => alive && setSrc(d)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return src;
}

function PhotoThumb({ id, date, onDelete }: { id: string; date: string; onDelete: () => void }) {
  const src = useStoredPhoto(id);
  return (
    <figure className="photo-thumb">
      {src ? <img src={src} alt={t("Progress photo from {date}", { date: shortDate(date) })} /> : <div className="photo-thumb-empty" />}
      <figcaption>{shortDate(date)}</figcaption>
      <button className="photo-del" aria-label={t("Delete photo from {date}", { date: shortDate(date) })} onClick={onDelete}>
        <Trash2 size={13} />
      </button>
    </figure>
  );
}

function ProgressPhotos() {
  useLanguage();
  const photos = useStore((s) => s.photos);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [split, setSplit] = useState(50);
  const before = useStoredPhoto(photos[0]?.id);
  const after = useStoredPhoto(photos.length > 1 ? photos[photos.length - 1].id : undefined);
  const add = async (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await shrinkPhoto(file);
      const id = uid();
      await savePhoto(id, data);
      actions.addPhoto({ id, date: todayKey(), createdAt: Date.now() });
      haptic("success");
    } catch {
      showToast(t("Couldn't save that photo."));
    } finally {
      setBusy(false);
    }
  };
  const pick = async (source: "camera" | "library") => {
    if (!isNative) return input.current?.click();
    try {
      await add(await pickNativePhoto(source));
    } catch {
      showToast(t("Couldn't open the camera or photos. Allow access in Settings."));
    }
  };
  return (
    <>
      <div className="section-header">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Camera size={14} /> {t("Progress photos")}
        </span>
      </div>
      {photos.length > 1 && before && after && (
        <div className="card compare" data-testid="photo-compare">
          <div className="compare-frame">
            <img src={after} alt={t("After: {date}", { date: shortDate(photos[photos.length - 1].date) })} />
            <div className="compare-before" style={{ width: `${split}%` }}>
              {/* As wide as the whole frame, so only its left part shows. */}
              <img src={before} alt={t("Before: {date}", { date: shortDate(photos[0].date) })} style={{ width: `${10000 / Math.max(split, 1)}%`, maxWidth: "none" }} />
            </div>
            <span className="compare-label left">{shortDate(photos[0].date)}</span>
            <span className="compare-label right">{shortDate(photos[photos.length - 1].date)}</span>
          </div>
          <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={t("Slide to compare before and after")} style={{ width: "100%", marginTop: 10 }} />
        </div>
      )}
      <div className="photo-grid" style={{ marginTop: 10 }}>
        {[...photos].reverse().map((p) => (
          <PhotoThumb
            key={p.id}
            id={p.id}
            date={p.date}
            onDelete={() => {
              actions.removePhoto(p.id);
              void deletePhoto(p.id);
            }}
          />
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 10 }}>
        {isNative && (
          <button className="btn small tinted" onClick={() => pick("camera")} disabled={busy}>
            <Camera size={15} /> {t("Take photo")}
          </button>
        )}
        <button className="btn small tinted" onClick={() => pick("library")} disabled={busy}>
          <ImagePlus size={15} /> {t("Add photo")}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={t("Progress photo")}
        onChange={(e) => {
          void add(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p className="footnote">{t("Photos stay on this phone only. They aren't uploaded or included in backups.")}</p>
    </>
  );
}
