import { useEffect, useState } from "react";
import { ChefHat, Compass, Dices, Disc3, Flashlight, Gamepad2, Goal, Hammer, Music, Package, Shirt, Shovel, Store, Swords, Trophy, Wind } from "lucide-react";
import type { ComponentType } from "react";
import {
  GiBallerinaShoes,
  GiBoxingGlove,
  GiDart,
  GiDragonHead,
  GiFrisbee,
  GiHighKick,
  GiHockey,
  GiKimono,
  GiMeditation,
  GiMountainClimbing,
  GiPoolDive,
  GiPunch,
  GiPunchingBag,
  GiRopeCoil,
  GiShuttlecock,
  GiSkis,
  GiSoccerKick,
  GiSpinningTop,
  GiSprint,
  GiTennisRacket,
} from "react-icons/gi";
import {
  MdAccessible,
  MdChildCare,
  MdCleaningServices,
  MdDeliveryDining,
  MdDesk,
  MdDirectionsBike,
  MdDirectionsRun,
  MdDirectionsWalk,
  MdDownhillSkiing,
  MdElectricBike,
  MdElectricScooter,
  MdGrass,
  MdHiking,
  MdHouse,
  MdIceSkating,
  MdKayaking,
  MdKitesurfing,
  MdLocalCarWash,
  MdLocalLaundryService,
  MdNordicWalking,
  MdParagliding,
  MdPedalBike,
  MdPets,
  MdPool,
  MdRollerSkating,
  MdRowing,
  MdSailing,
  MdScubaDiving,
  MdSelfImprovement,
  MdShoppingCart,
  MdSkateboarding,
  MdSnowboarding,
  MdSnowshoeing,
  MdSoupKitchen,
  MdSportsBaseball,
  MdSportsBasketball,
  MdSportsCricket,
  MdSportsEsports,
  MdSportsFootball,
  MdSportsGolf,
  MdSportsGymnastics,
  MdSportsHandball,
  MdSportsHockey,
  MdSportsKabaddi,
  MdSportsMartialArts,
  MdSportsMma,
  MdSportsRugby,
  MdSportsSoccer,
  MdSportsTennis,
  MdSportsVolleyball,
  MdStairs,
  MdStroller,
  MdSurfing,
  MdWindow,
} from "react-icons/md";
import { TbArcheryArrow, TbBowling, TbFishHook, TbHorse, TbJumpRope, TbMountain, TbPingPong, TbSportBillard, TbStretching, TbStretching2, TbSwimming, TbTreadmill, TbVacuumCleaner, TbYoga } from "react-icons/tb";
import { exerciseIconKey } from "../lib/exerciseIcon";
import { t, useLanguage } from "../i18n";
import { exName } from "../i18n/exercises";
import { PICTOGRAMS, type Shape } from "./pictograms";
import { EXERCISE_BY_NAME } from "../data/exercises";

// Lists show an icon for each exercise's category. An exercise's own page shows its photos from
// free-exercise-db (public domain): a start and an end position, 240 px WebP files in public/exercises.
// Sports and activities without a photo show their icon there too.
// The name → picture map is loaded on first use so it isn't part of app start-up.

let images: Record<string, string> | null = null;
let pending: Promise<void> | null = null;
const waiting = new Set<() => void>();

function loadImages() {
  pending ??= import("../data/exerciseImages.json").then((m) => {
    images = m.default as Record<string, string>;
    waiting.forEach((f) => f());
  });
  return pending;
}

function useImageId(name: string) {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (images) return;
    const f = () => rerender((n) => n + 1);
    waiting.add(f);
    void loadImages();
    return () => void waiting.delete(f);
  }, []);
  return images?.[name];
}

const src = (id: string, frame: 0 | 1) => `${import.meta.env.BASE_URL}exercises/${id}-${frame}.webp`;

/** Tile colour: the exercise's muscle group or kind of activity. */
const COLORS: Record<string, string> = {
  Chest: "var(--blue)",
  Back: "var(--indigo)",
  Shoulders: "var(--purple)",
  Arms: "var(--orange)",
  Legs: "var(--green)",
  Core: "var(--pink)",
  "Full Body": "var(--teal)",
  Walking: "var(--green)",
  Running: "var(--orange)",
  Cycling: "var(--blue)",
  "Gym Cardio": "var(--red)",
  Combat: "var(--red)",
  Classes: "var(--purple)",
  Swimming: "var(--teal)",
  Sports: "var(--orange)",
  Everyday: "var(--indigo)",
  "Mind & Body": "var(--pink)",
  "Water Sports": "var(--blue)",
  Outdoor: "var(--green)",
  "Racket Sports": "var(--orange)",
  Dance: "var(--pink)",
};

type Glyph = ComponentType<{ size?: number | string }>;

/** Sports and activities: an icon of the sport itself. Gym movements are drawn as pictograms instead. */
const ACTIVITY_ICONS: Record<string, Glyph> = {
  badminton: GiShuttlecock,
  pingPong: TbPingPong,
  squash: GiTennisRacket,
  tennis: MdSportsTennis,
  takraw: GiSoccerKick,
  americanFootball: MdSportsFootball,
  soccer: MdSportsSoccer,
  basketball: MdSportsBasketball,
  waterPolo: MdPool,
  volleyball: MdSportsVolleyball,
  handball: MdSportsHandball,
  iceHockey: GiHockey,
  hockey: MdSportsHockey,
  rugby: MdSportsRugby,
  cricket: MdSportsCricket,
  baseball: MdSportsBaseball,
  golf: MdSportsGolf,
  bowling: TbBowling,
  frisbee: GiFrisbee,
  kabaddi: MdSportsKabaddi,
  billiards: TbSportBillard,
  darts: GiDart,
  archery: TbArcheryArrow,
  fencing: Swords,
  gymnastics: MdSportsGymnastics,
  top: GiSpinningTop,
  boardGame: Dices,
  punchingBag: GiPunchingBag,
  punch: GiPunch,
  kick: GiHighKick,
  boxing: GiBoxingGlove,
  wrestling: MdSportsMma,
  martialArts: MdSportsMartialArts,
  meditation: GiMeditation,
  taiChi: MdSelfImprovement,
  yoga: TbYoga,
  pilates: TbStretching2,
  stretching: TbStretching,
  lionDance: GiDragonHead,
  ballet: GiBallerinaShoes,
  dance: Music,
  scuba: MdScubaDiving,
  diving: GiPoolDive,
  kitesurf: MdKitesurfing,
  surf: MdSurfing,
  sailing: MdSailing,
  kayak: MdKayaking,
  rowing: MdRowing,
  jetSki: MdSurfing,
  pool: MdPool,
  swim: TbSwimming,
  snowboard: MdSnowboarding,
  snowshoe: MdSnowshoeing,
  nordicSki: GiSkis,
  skiErg: MdDownhillSkiing,
  ski: MdDownhillSkiing,
  iceSkate: MdIceSkating,
  rollerSkate: MdRollerSkating,
  skateboard: MdSkateboarding,
  scooter: MdElectricScooter,
  horse: TbHorse,
  wheelchair: MdAccessible,
  elliptical: MdDirectionsRun,
  stairs: MdStairs,
  treadmill: TbTreadmill,
  jumpRope: TbJumpRope,
  ropeClimb: GiRopeCoil,
  videoGame: MdSportsEsports,
  aerobics: GiKimono,
  eBike: MdElectricBike,
  mountainBike: MdPedalBike,
  spinBike: MdPedalBike,
  bike: MdDirectionsBike,
  climbing: GiMountainClimbing,
  mountain: TbMountain,
  nordicWalk: MdNordicWalking,
  hiking: MdHiking,
  fishing: TbFishHook,
  compass: Compass,
  kite: MdParagliding,
  caving: Flashlight,
  stroller: MdStroller,
  dog: MdPets,
  child: MdChildCare,
  vacuum: TbVacuumCleaner,
  cleaning: MdCleaningServices,
  window: MdWindow,
  mowing: MdGrass,
  gardening: Shovel,
  shovel: Shovel,
  shopping: MdShoppingCart,
  boxes: Package,
  car: MdLocalCarWash,
  tools: Hammer,
  cooking: ChefHat,
  dishes: MdSoupKitchen,
  laundry: MdLocalLaundryService,
  desk: MdDesk,
  delivery: MdDeliveryDining,
  caregiving: MdAccessible,
  store: Store,
  sprint: GiSprint,
  trailRun: MdDirectionsRun,
  run: MdDirectionsRun,
  walk: MdDirectionsWalk,
  trophy: Trophy,
  house: MdHouse,
  wind: Wind,
  disc: Disc3,
  game: Gamepad2,
  shirt: Shirt,
};

function Pictogram({ shapes, size }: { shapes: Shape[]; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {shapes.map((s, i) => {
        if (s[0] === "l") {
          const p = s.slice(1) as number[];
          let d = `M${p[0]} ${p[1]}`;
          for (let j = 2; j < p.length; j += 2) d += `L${p[j]} ${p[j + 1]}`;
          return <path key={i} d={d} />;
        }
        if (s[0] === "c") return <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} fill="currentColor" stroke="none" />;
        if (s[0] === "o") return <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} />;
        return <path key={i} d={s[1]} />;
      })}
    </svg>
  );
}

/** An exercise's own icon: a pictogram of the movement, or an icon of the sport or activity. */
function Icon({ name, kind, category, met, size }: { name: string; kind: "strength" | "cardio"; category: string; met?: number; size: number }) {
  const key = exerciseIconKey({ name, kind, category, met });
  const shapes = PICTOGRAMS[key];
  const Lib = ACTIVITY_ICONS[key] ?? Goal;
  return (
    <div className="ex-pic ex-pic-icon" aria-hidden data-icon={key} style={{ width: size, height: size, background: COLORS[category] ?? "var(--gray)" }}>
      {shapes ? <Pictogram shapes={shapes} size={Math.round(size * 0.78)} /> : <Lib size={Math.round(size * 0.56)} />}
    </div>
  );
}

/** An icon of the exercise itself, used in every list. The photos are on the exercise's own page. */
export function ExerciseThumb({ name, size = 44 }: { name: string; category?: string; size?: number }) {
  const e = EXERCISE_BY_NAME.get(name);
  return <Icon name={name} kind={e?.kind ?? "strength"} category={e?.category ?? ""} met={e?.met} size={size} />;
}

/** Large picture for an exercise's page: start and end positions, shown one after the other. */
export function ExerciseHero({ name }: { name: string; category?: string }) {
  useLanguage();
  const id = useImageId(name);
  const [broken, setBroken] = useState(false);
  if (!id || broken)
    return (
      <div className="ex-hero ex-hero-icon">
        <ExerciseThumb name={name} size={88} />
      </div>
    );
  return (
    <div className="ex-hero" role="img" aria-label={t("{name}: start and end position", { name: exName(name) })} data-testid="exercise-picture">
      <img src={src(id, 0)} alt="" decoding="async" onError={() => setBroken(true)} />
      <img src={src(id, 1)} alt="" decoding="async" className="ex-hero-end" />
    </div>
  );
}
