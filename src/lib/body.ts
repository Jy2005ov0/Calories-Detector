import type { Measurement, Profile } from "./types";

/**
 * Body-fat percentage from tape measurements (US Navy method, Hodgdon & Beckett 1984).
 * Men need waist and neck; women also hips. Null when a measurement is missing or doesn't make sense.
 */
export function navyBodyFat(p: Pick<Profile, "sex" | "heightCm">, m: Pick<Measurement, "waistCm" | "neckCm" | "hipCm">): number | null {
  const { waistCm: waist, neckCm: neck, hipCm: hip } = m;
  if (!waist || !neck || !p.heightCm) return null;
  let bf: number;
  if (p.sex === "male") {
    if (waist <= neck) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(p.heightCm)) - 450;
  } else {
    if (!hip || waist + hip <= neck) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(p.heightCm)) - 450;
  }
  return bf > 2 && bf < 70 ? Math.round(bf * 10) / 10 : null;
}

/** Rough bands for body fat (American Council on Exercise). */
export function bodyFatBand(sex: Profile["sex"], bf: number): "essential" | "athletic" | "fit" | "average" | "high" {
  const cut = sex === "male" ? [6, 14, 18, 25] : [14, 21, 25, 32];
  if (bf < cut[0]) return "essential";
  if (bf < cut[1]) return "athletic";
  if (bf < cut[2]) return "fit";
  if (bf < cut[3]) return "average";
  return "high";
}

/** The most recent value of each measurement (they may come from different days). */
export function latestMeasurements(list: Measurement[]): Partial<Measurement> {
  const out: Partial<Measurement> = {};
  for (const m of list) for (const k of ["waistCm", "neckCm", "hipCm", "chestCm", "armCm", "thighCm"] as const) if (m[k]) out[k] = m[k];
  return out;
}

/** Change in one measurement from the first to the last entry that has it. */
export function measurementChange(list: Measurement[], key: keyof Pick<Measurement, "waistCm" | "neckCm" | "hipCm" | "chestCm" | "armCm" | "thighCm">): number | null {
  const has = list.filter((m) => m[key]);
  if (has.length < 2) return null;
  return Math.round((has[has.length - 1][key]! - has[0][key]!) * 10) / 10;
}
