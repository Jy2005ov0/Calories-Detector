import { EXERCISES, EXERCISE_BY_NAME, myExercises } from "./exercises";

/** Muscle groups a training day can be built from. */
export type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "quads" | "hamstrings" | "glutes" | "calves" | "core" | "forearms";

export const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "quads", label: "Quads" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "glutes", label: "Glutes" },
  { id: "calves", label: "Calves" },
  { id: "core", label: "Abs & core" },
  { id: "forearms", label: "Forearms" },
];

/** Where the person trains: what equipment the plan can use. */
export type Equipment = "gym" | "dumbbells" | "home";

/**
 * The well-known exercises for each muscle group, best first: [name, compound].
 * Plans are built from these; the swap list adds the rest of the library after them.
 */
const STAPLES: Record<MuscleGroup, [string, boolean][]> = {
  chest: [
    ["Barbell bench press", true], ["Incline dumbbell press", true], ["Dumbbell bench press", true], ["Incline barbell bench press", true],
    ["Machine chest press", true], ["Chest dip", true], ["Push-up", true], ["Incline push-up", true], ["Decline push-up", true],
    ["Dumbbell floor press", true], ["Band chest press", true], ["Cable crossover", false], ["Pec deck / machine fly", false],
    ["Dumbbell fly", false], ["Incline dumbbell fly", false], ["Low-to-high cable fly", false], ["Band chest fly", false],
  ],
  back: [
    ["Pull-up", true], ["Barbell row", true], ["Lat pulldown", true], ["One-arm dumbbell row", true], ["Seated cable row", true],
    ["T-bar row", true], ["Chest-supported dumbbell row", true], ["Chin-up", true], ["Machine row", true], ["Inverted row", true],
    ["Renegade row", true], ["Band row", true], ["Band lat pulldown", true], ["Straight-arm pulldown", false],
    ["Dumbbell pullover", false], ["Back extension", false], ["Superman hold", false],
  ],
  shoulders: [
    ["Overhead press (barbell)", true], ["Seated dumbbell shoulder press", true], ["Arnold press", true], ["Machine shoulder press", true],
    ["Standing dumbbell shoulder press", true], ["Kettlebell overhead press", true], ["Pike push-up", true], ["Band overhead press", true],
    ["Dumbbell lateral raise", false], ["Cable lateral raise", false], ["Machine lateral raise", false], ["Rear delt fly", false],
    ["Reverse pec deck", false], ["Face pull", false], ["Front raise", false], ["Upright row", false], ["Dumbbell shrug", false],
    ["Band lateral raise", false], ["Band pull-apart", false], ["Band face pull", false],
  ],
  biceps: [
    ["Chin-up", true], ["Barbell curl", false], ["Dumbbell curl", false], ["Hammer curl", false], ["Incline dumbbell curl", false],
    ["EZ-bar curl", false], ["Cable curl", false], ["Concentration curl", false], ["Spider curl", false], ["Single-arm preacher curl", false],
    ["Machine biceps curl", false], ["Kettlebell curl", false], ["Band biceps curl", false],
  ],
  triceps: [
    ["Close-grip bench press", true], ["Triceps dip", true], ["Diamond push-up", true], ["Bench dip", true],
    ["Triceps pushdown (rope)", false], ["Triceps pushdown (bar)", false], ["Skull crusher", false], ["Overhead triceps extension", false],
    ["Dumbbell kickback", false], ["Lying dumbbell triceps extension", false], ["Cable triceps kickback", false],
    ["Machine triceps extension", false], ["Band triceps pushdown", false], ["Bodyweight triceps extension", false],
  ],
  quads: [
    ["Back squat", true], ["Leg press", true], ["Front squat", true], ["Hack squat", true], ["Bulgarian split squat", true],
    ["Goblet squat", true], ["Walking lunge", true], ["Step-up", true], ["Smith machine squat", true], ["Bodyweight squat", true],
    ["Bodyweight lunge", true], ["Jump squat", true], ["Pistol squat", true], ["Leg extension", false], ["Sissy squat", false],
    ["Wall sit", false], ["Spanish squat", false],
  ],
  hamstrings: [
    ["Romanian deadlift", true], ["Deadlift", true], ["Dumbbell Romanian deadlift", true], ["Single-leg Romanian deadlift", true],
    ["Good morning", true], ["Kettlebell Romanian deadlift", true], ["Lying leg curl", false], ["Seated leg curl", false],
    ["Nordic hamstring curl", false], ["Sliding leg curl", false], ["Stability ball leg curl", false], ["Band good morning", false],
  ],
  glutes: [
    ["Hip thrust", true], ["Reverse lunge", true], ["Sumo deadlift", true], ["Kettlebell swing", true], ["Smith machine hip thrust", true],
    ["Lateral step-up", true], ["Glute bridge", false], ["Single-leg glute bridge", false], ["Single-leg hip thrust", false],
    ["Cable kickback", false], ["Glute kickback machine", false], ["Cable pull-through", false], ["Banded glute bridge", false],
    ["Frog pump", false], ["Monster Walk", false],
  ],
  calves: [
    ["Standing calf raise", false], ["Seated calf raise", false], ["Leg press calf raise", false], ["Donkey calf raise", false],
    ["Smith machine calf raise", false], ["Standing Dumbbell Calf Raise", false], ["Single-leg calf raise", false], ["Calf Raises - With Bands", false],
  ],
  core: [
    ["Hanging leg raise", false], ["Cable crunch", false], ["Ab wheel rollout", false], ["Plank", false], ["Hanging knee raise", false],
    ["Russian twist", false], ["Dead bug", false], ["Side plank", false], ["Crunch", false], ["Bicycle crunch", false],
    ["Hollow body hold", false], ["V-up", false], ["Mountain climber", false], ["Woodchopper", false], ["Machine crunch", false],
  ],
  forearms: [
    ["Farmer's carry", true], ["Wrist curl", false], ["Reverse curl", false], ["Dead hang", false], ["Plate pinch hold", false], ["Wrist roller", false],
  ],
};

/** The library's muscle names that count as each group (an exercise's first muscle is the main one). */
const PRIMARY: Record<MuscleGroup, string[]> = {
  chest: ["Chest", "Upper chest"],
  back: ["Lats", "Middle back", "Mid back", "Upper back", "Lower back"],
  shoulders: ["Shoulders", "Front delts", "Side delts", "Rear delts", "Delts", "Traps"],
  biceps: ["Biceps"],
  triceps: ["Triceps"],
  quads: ["Quadriceps", "Quads"],
  hamstrings: ["Hamstrings"],
  glutes: ["Glutes", "Abductors"],
  calves: ["Calves"],
  core: ["Abdominals", "Abs", "Core", "Obliques"],
  forearms: ["Forearms", "Grip"],
};

/** Stretches, foam rolling, drills and stunts aren't workout exercises. */
const NOT_A_LIFT = /stretch|smr\b|-smr|drill|technique|circles|balance board|claw|series|planche|front lever|back lever|human flag|muscle-up|atlas|tyre|sandbag|log press|sled|rickshaw|chain|power stairs|start|wall walk|handstand hold|body-up/i;

const BY_NAME = EXERCISE_BY_NAME;

/** What kind of place an exercise needs. Bands, TRX and small kit (ab wheel, ball) count as home. */
export function equipmentOf(e: { equipment?: string; name: string }): Equipment {
  if (["Bodyweight", "Resistance band", "TRX"].includes(e.equipment ?? "")) return "home";
  if (e.equipment === "Equipment" && /ab wheel|ab roller|stability ball|medicine ball|plate pinch|dead hang/i.test(e.name)) return "home";
  if (["Dumbbell", "Kettlebell"].includes(e.equipment ?? "")) return "dumbbells";
  return "gym";
}

/** Whether a place has the kit for an exercise: a gym has everything, dumbbells-at-home also allows bodyweight. */
export function allowed(where: Equipment, e: { equipment?: string; name: string }) {
  const need = equipmentOf(e);
  return where === "gym" || need === "home" || (where === "dumbbells" && need === "dumbbells");
}

export interface PoolEntry {
  name: string;
  compound: boolean;
  /** One of the well-known exercises (the rest come from the library). */
  staple: boolean;
}

const poolCache = new Map<MuscleGroup, PoolEntry[]>();

/** Every exercise for a muscle group: the person's own first, then the staples, then the rest of the library. */
export function poolFor(group: MuscleGroup): PoolEntry[] {
  const base = libraryPool(group);
  const own = myExercises().filter((e) => e.kind === "strength" && groupOf(e.name) === group && BY_NAME.get(e.name) === e);
  if (!own.length) return base;
  // Never picked for a plan over a staple; offered first when swapping.
  return [...own.map((e) => ({ name: e.name, compound: (e.muscles?.length ?? 0) >= 3 || e.met >= 5, staple: false })), ...base];
}

function libraryPool(group: MuscleGroup): PoolEntry[] {
  const hit = poolCache.get(group);
  if (hit) return hit;
  const seen = new Set<string>();
  const out: PoolEntry[] = [];
  for (const [name, compound] of STAPLES[group]) {
    if (!BY_NAME.has(name) || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, compound, staple: true });
  }
  for (const e of EXERCISES) {
    if (e.kind !== "strength" || seen.has(e.name) || NOT_A_LIFT.test(e.name)) continue;
    if (!PRIMARY[group].includes(e.muscles?.[0] ?? "")) continue;
    seen.add(e.name);
    // Several muscles worked usually means a multi-joint lift.
    out.push({ name: e.name, compound: (e.muscles?.length ?? 0) >= 3, staple: false });
  }
  poolCache.set(group, out);
  return out;
}

/** The muscle group an exercise mainly trains, when it has one. */
export function groupOf(name: string): MuscleGroup | null {
  const e = BY_NAME.get(name);
  if (!e?.id.startsWith("my-")) for (const g of MUSCLE_GROUPS) if (STAPLES[g.id].some(([n]) => n === name)) return g.id;
  const m = e?.muscles?.[0];
  if (!m) return null;
  return (Object.keys(PRIMARY) as MuscleGroup[]).find((g) => PRIMARY[g].includes(m)) ?? null;
}

export const exerciseByName = (name: string) => BY_NAME.get(name);

/** For tests: staples that aren't in the exercise library. */
export const missingStaples = () =>
  (Object.keys(STAPLES) as MuscleGroup[]).flatMap((g) => STAPLES[g].filter(([n]) => !BY_NAME.has(n)).map(([n]) => `${g}: ${n}`));
