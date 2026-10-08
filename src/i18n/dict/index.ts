export type Lang = "en" | "ms" | "zh";
export type Dict = Record<string, string>;
export type AreaDict = { ms: Dict; zh: Dict };

// Each area of the app keeps its own translations; they are merged here.
const AREAS: AreaDict[] = [];

export const DICTS: Record<Exclude<Lang, "en">, Dict> = {
  ms: Object.assign({}, ...AREAS.map((a) => a.ms)),
  zh: Object.assign({}, ...AREAS.map((a) => a.zh)),
};
