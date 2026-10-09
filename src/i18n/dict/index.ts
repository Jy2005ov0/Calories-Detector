export type Lang = "en" | "ms" | "zh";
export type Dict = Record<string, string>;
export type AreaDict = { ms: Dict; zh: Dict };

import { CORE } from "./core";
import { CYCLE } from "./cycle";
import { FOOD } from "./food";
import { PLAN } from "./plan";
import { PROFILE } from "./profile";
import { TRAIN } from "./train";

// Each area of the app keeps its own translations; they are merged here.
const AREAS: AreaDict[] = [CORE, FOOD, TRAIN, PLAN, PROFILE, CYCLE];

export const DICTS: Record<Exclude<Lang, "en">, Dict> = {
  ms: Object.assign({}, ...AREAS.map((a) => a.ms)),
  zh: Object.assign({}, ...AREAS.map((a) => a.zh)),
};
