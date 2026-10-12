// GPS runs and walks: distance, pace and calories from the phone's location, all on the phone.

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance in metres between two [lat, lng] points (haversine). */
export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Fix {
  lat: number;
  lng: number;
  /** Accuracy in metres. */
  acc: number;
  t: number;
}

/**
 * Whether a new GPS reading should count: accurate enough, and a real move rather than jitter
 * (a phone standing still drifts a few metres) or a jump faster than anyone runs.
 */
export function acceptFix(prev: Fix | null, next: Fix): boolean {
  if (next.acc > 35) return false;
  if (!prev) return true;
  const d = haversine([prev.lat, prev.lng], [next.lat, next.lng]);
  const secs = Math.max(1, (next.t - prev.t) / 1000);
  if (d / secs > 12) return false; // faster than 43 km/h
  return d >= Math.max(3, next.acc / 3);
}

export function routeDistance(route: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < route.length; i++) d += haversine(route[i - 1], route[i]);
  return d;
}

/** Pace in minutes per km, or null when too short to say. */
export function pace(distanceM: number, seconds: number): number | null {
  if (distanceM < 50 || seconds <= 0) return null;
  return seconds / 60 / (distanceM / 1000);
}

export const formatPace = (minPerKm: number | null) => {
  if (minPerKm === null || !isFinite(minPerKm) || minPerKm > 60) return "–";
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, "0")}`;
};

/** MET for walking or running at an average speed (2024 Compendium of Physical Activities, interpolated). */
export function metForSpeed(kmh: number): number {
  const table: [number, number][] = [
    [0, 1.3], [3.2, 2.8], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [7.2, 6.5], [8, 8.3], [9.7, 9.8], [11.3, 11.0], [12.9, 11.8], [14.5, 12.8], [16.1, 14.5], [19.3, 19.0],
  ];
  if (kmh >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 1; i < table.length; i++) {
    const [s1, m1] = table[i];
    const [s0, m0] = table[i - 1];
    if (kmh <= s1) return m0 + ((m1 - m0) * (kmh - s0)) / (s1 - s0);
  }
  return 1.3;
}

/** Calories for a walk or run: MET × weight × hours. */
export function runKcal(distanceM: number, seconds: number, weightKg: number): number {
  if (seconds <= 0) return 0;
  const kmh = distanceM / 1000 / (seconds / 3600);
  return metForSpeed(kmh) * weightKg * (seconds / 3600);
}

/** Thin a long route to at most `max` points for saving and drawing. */
export function simplify(route: [number, number][], max = 400): [number, number][] {
  if (route.length <= max) return route;
  const step = (route.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => route[Math.round(i * step)]);
}
