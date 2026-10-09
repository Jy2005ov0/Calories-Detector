import { useEffect, useState } from "react";
import {
  Activity,
  Bike,
  BicepsFlexed,
  Dumbbell,
  Flower2,
  Footprints,
  Goal,
  HeartPulse,
  House,
  Mountain,
  Music,
  PersonStanding,
  Sailboat,
  Swords,
  Target,
  Trophy,
  Volleyball,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { EXERCISE_BY_NAME } from "../data/exercises";

// Pictures of exercises from free-exercise-db (public domain): a start and an end position,
// 240 px WebP files in public/exercises. Sports and activities without a photo get an icon.
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

const ICONS: Record<string, [LucideIcon, string]> = {
  Chest: [Dumbbell, "var(--blue)"],
  Back: [Dumbbell, "var(--indigo)"],
  Shoulders: [Dumbbell, "var(--purple)"],
  Arms: [BicepsFlexed, "var(--orange)"],
  Legs: [PersonStanding, "var(--green)"],
  Core: [Target, "var(--pink)"],
  "Full Body": [Activity, "var(--teal)"],
  Walking: [Footprints, "var(--green)"],
  Running: [Footprints, "var(--orange)"],
  Cycling: [Bike, "var(--blue)"],
  "Gym Cardio": [HeartPulse, "var(--red)"],
  Combat: [Swords, "var(--red)"],
  Classes: [Music, "var(--purple)"],
  Swimming: [Waves, "var(--teal)"],
  Sports: [Trophy, "var(--orange)"],
  Everyday: [House, "var(--indigo)"],
  "Mind & Body": [Flower2, "var(--pink)"],
  "Water Sports": [Sailboat, "var(--blue)"],
  Outdoor: [Mountain, "var(--green)"],
  "Racket Sports": [Volleyball, "var(--orange)"],
  Dance: [Music, "var(--pink)"],
};

function Icon({ category, size }: { category: string; size: number }) {
  const [Glyph, color] = ICONS[category] ?? [Goal, "var(--gray)"];
  return (
    <div className="ex-pic ex-pic-icon" aria-hidden style={{ width: size, height: size, background: color }}>
      <Glyph size={Math.round(size * 0.5)} />
    </div>
  );
}

/** Small square picture for an exercise list row. */
export function ExerciseThumb({ name, category = EXERCISE_BY_NAME.get(name)?.category ?? "", size = 44 }: { name: string; category?: string; size?: number }) {
  const id = useImageId(name);
  const [broken, setBroken] = useState(false);
  if (!id || broken) return <Icon category={category} size={size} />;
  return <img className="ex-pic" src={src(id, 0)} alt="" aria-hidden width={size} height={size} loading="lazy" decoding="async" onError={() => setBroken(true)} style={{ width: size, height: size }} />;
}

/** Large picture for an exercise's page: start and end positions, shown one after the other. */
export function ExerciseHero({ name, category }: { name: string; category: string }) {
  const id = useImageId(name);
  const [broken, setBroken] = useState(false);
  if (!id || broken)
    return (
      <div className="ex-hero ex-hero-icon">
        <Icon category={category} size={88} />
      </div>
    );
  return (
    <div className="ex-hero" role="img" aria-label="" data-testid="exercise-picture">
      <img src={src(id, 0)} alt="" decoding="async" onError={() => setBroken(true)} />
      <img src={src(id, 1)} alt="" decoding="async" className="ex-hero-end" />
    </div>
  );
}
