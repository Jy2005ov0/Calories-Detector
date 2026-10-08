# Calories — Food & Training

A mobile-first calorie and gym app with an Apple-style interface. It counts calories from a **photo** or a **search**, tracks gym sessions with **clock in / clock out**, builds a **training split** (chest, back, arms, legs…) and a matching **meal plan**, and tells you whether a meal is **healthy and right for your goal**.

Install it on your phone from the browser: Share → *Add to Home Screen*.

## Features

| | |
|---|---|
| **Photo calories** | Snap or upload a meal. Claude vision lists each food, estimates the grams and works out the calories and macros. You can fix the grams before logging. |
| **Food search** | 410 built-in foods (per 100 g, from USDA and the Malaysian Food Composition Database), including nasi lemak, roti canai, char kway teow, teh tarik and kuih. Typing 3+ letters also searches **Open Food Facts** (millions of packaged products, no key needed). |
| **Meal builder** | Combine any foods and quantities. See live totals, a health grade (A–E) and whether it fits your goal. Then log it or save it to reuse later. |
| **Custom foods** | Copy any nutrition label into *My Foods*. |
| **Health check** | Every food and meal gets a 0–100 score (protein and fibre per calorie versus sugar, saturated fat and sodium) plus a verdict against what you still have left today. |
| **Clock in / out** | A live timer and calorie counter for your gym session. Log sets (kg × reps), cardio minutes and volume. |
| **Exercise database** | 236 entries: 125 strength exercises with muscles, equipment and form cues, plus 111 cardio, sport, class and combat activities with MET values from the 2024 Compendium of Physical Activities. |
| **Training plans** | Body-part split (Chest / Back / Legs / Shoulders / Arms), Push-Pull-Legs, Upper/Lower or Full Body, set for 2–6 days a week. Sets, reps, rest and RIR follow your goal and experience. Start any day with one tap. |
| **Nutrition plan** | Calorie target (Mifflin-St Jeor × activity, ±goal), protein/carb/fat targets, foods to eat and limit, a sample day scaled to your target, and tips on meal timing. Supports halal, vegetarian and vegan diets. |

## Design

The UI follows [emilkowalski/skills → apple-design](https://github.com/emilkowalski/skills/tree/main/skills/apple-design):

- System font, size-specific tracking, grouped inset lists and large titles. iOS system colours for light and dark mode.
- Translucent `backdrop-filter` tab bar and toasts.
- Critically damped springs (Motion) by default. Bottom sheets track the finger 1:1, rubber-band at the top, and use Apple's momentum projection to decide whether a flick dismisses them.
- Buttons respond on press (`scale(0.97)`), tabs switch on pointer-down, and haptics fire only for meaningful events (clock in/out, logging, a completed set).
- Undo for slips instead of confirmation dialogs. Confirmations are kept for destructive actions only.
- Respects `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast`.

## Run it

```bash
npm install
cp .env.example .env      # add ANTHROPIC_API_KEY to enable photo recognition
npm run dev               # web on http://localhost:5173, API on :8787
```

Production:

```bash
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm start   # serves dist/ and the API on $PORT (default 8787)
```

Everything except photo recognition works without a key. Search, plans and tracking run entirely in the browser, and your data is stored in `localStorage` on your device.

```bash
npm test         # calculation + database integrity tests
npm run typecheck
```

## How the numbers work

- **Calorie target**: BMR (Mifflin-St Jeor) × activity factor, then −20 % to lose fat, +10 % to build muscle. There is a floor of 1,500 kcal for men and 1,200 kcal for women.
- **Protein**: 2.0 g/kg while cutting, otherwise 1.8 g/kg. Fat is 27–28 % of calories and carbs fill the rest.
- **Limits**: free sugar under 10 % of calories and saturated fat under 10 % (WHO). Sodium under 2,000 mg.
- **Exercise calories**: MET × body weight (kg) × hours. Each completed strength set counts as 2 minutes, including rest. Clocked-in time with no exercise logged counts as general gym training (3.5 MET).
- **Photo estimates** can be off by 20–30 %, especially for oil and sauces. Weigh your food when you need accuracy.

This is general guidance, not medical advice.

## Project layout

```
server/index.ts          Express API: /api/analyze-photo (Claude vision + structured output)
src/data/foods.ts        Food database
src/data/exercises.ts    Exercise & activity database
src/lib/nutrition.ts     Targets, health score, suitability, search
src/lib/fitness.ts       Session calories, plan generator
src/lib/diet.ts          Food recommendations & sample day
src/lib/store.ts         localStorage-backed state
src/screens/*            Today, Food, Train, Plan, Profile (+ onboarding)
src/components/*         Sheet, segmented control, rings, food/photo/meal sheets
```
