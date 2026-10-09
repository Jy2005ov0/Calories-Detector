// Builds public/data/usda-sr28.json from the USDA National Nutrient Database for Standard
// Reference, Release 28 (public domain; packaged on npm as "fda-nutrient-database").
// Run: npm run data:usda
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = path.join(path.dirname(require.resolve("fda-nutrient-database/package.json")), "data");
const lines = (f) => fs.readFileSync(path.join(dir, f), "latin1").split(/\r?\n/).filter(Boolean);
const fields = (line) => line.split("^").map((v) => v.replace(/^~|~$/g, ""));

// FOOD_DES: NDB_No, FdGrp_Cd, Long_Desc, …
const des = new Map(lines("FOOD_DES.txt").map((l) => {
  const f = fields(l);
  return [f[0], { group: f[1], name: f[2] }];
}));

// USDA food groups → the app's categories.
const GROUPS = {
  "0100": "Eggs & Dairy", "0200": "Condiments", "0300": "Baby food", "0400": "Fats & Oils", "0500": "Poultry",
  "0600": "Soups & Sauces", "0700": "Meat", "0800": "Grains", "0900": "Fruits", "1000": "Meat", "1100": "Vegetables",
  "1200": "Legumes & Nuts", "1300": "Meat", "1400": "Drinks", "1500": "Seafood", "1600": "Legumes & Nuts",
  "1700": "Meat", "1800": "Baked goods", "1900": "Snacks", "2000": "Grains", "2100": "Fast Food", "2200": "American",
  "2500": "Snacks", "3500": "American", "3600": "Fast Food",
};

const num = (v) => (v === "" || v === undefined ? 0 : Number(v));
const r1 = (v) => Math.round(v * 10) / 10;
const out = [];
for (const l of lines("ABBREV.txt")) {
  // ABBREV (SR28 doc p.44): 0 NDB_No, 3 kcal, 4 protein, 5 fat, 7 carbs, 8 fibre, 9 sugar, 15 sodium,
  // 44 saturated fat, 48 GmWt_1, 49 GmWt_Desc1
  const f = fields(l);
  const d = des.get(f[0]);
  if (!d || f[3] === "") continue;
  const grams = num(f[48]) || 100;
  const label = f[48] ? f[49] : "100 g";
  out.push([
    f[0],
    d.name,
    GROUPS[d.group] ?? "American",
    num(f[3]),
    r1(num(f[4])),
    r1(num(f[7])),
    r1(num(f[5])),
    r1(Math.min(num(f[8]), num(f[7]))),
    r1(Math.min(num(f[9]), num(f[7]))),
    r1(Math.min(num(f[44]), num(f[5]))),
    Math.round(num(f[15])),
    label,
    r1(grams),
  ]);
}
const file = path.resolve("public/data/usda-sr28.json");
fs.writeFileSync(
  file,
  JSON.stringify({
    source: "USDA National Nutrient Database for Standard Reference, Release 28 (public domain)",
    columns: ["ndb", "name", "category", "kcal", "protein", "carbs", "fat", "fiber", "sugar", "satFat", "sodiumMg", "servingLabel", "servingGrams"],
    rows: out,
  }),
);
console.log(`${out.length} foods → ${path.relative(process.cwd(), file)} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
