# Calories — Food & Training

A mobile-first calorie and gym app with an Apple-style interface. It counts calories from a **photo** or a **search**, tracks gym sessions with **clock in / clock out**, builds a **training split** (chest, back, arms, legs…) and a matching **meal plan**, and tells you whether a meal is **healthy and right for your goal**.

Runs on **iOS and Android** three ways:

- **Native apps** for the App Store and Google Play, built with [Capacitor](https://capacitorjs.com) (`ios/` and `android/`).
- **Installable web app (PWA)**. In Safari tap Share → *Add to Home Screen*; in Chrome tap ⋮ → *Install app*. It works offline.
- **Any mobile or desktop browser.**

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
| **Body check (BMI)** | Enter your height and weight to get your BMI (body mass index) on an Asia-Pacific gauge and your healthy weight range. You also get a recommended goal, training split and cardio, calorie and protein targets, and foods to eat and limit. *Use this plan* applies it in one tap. |
| **? guide** | The round **?** button opens a 12-step guided tour that highlights each feature in turn. It opens once automatically after sign-up and works on every screen size. |
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

## Accounts & sync

Users can **Continue with Apple**, **Continue with Google**, **sign up with email**, or **use the app without an account**. With an account, the food log, workouts, custom foods, meals and plan are backed up and synced across every phone the user signs in on.

- **Server:** Express + SQLite (Node's built-in `node:sqlite`), no third-party auth service.
- **Passwords:** hashed with scrypt and a per-user salt. Logins are rate-limited, and a wrong password gets the same answer as an unknown email.
- **Sessions:** random 256-bit tokens; only their SHA-256 is stored. They last 90 days and are revoked on sign-out.
- **Google & Apple:** the ID token is verified against Google's and Apple's public keys (issuer, audience, expiry). A verified email links to an existing account. Any password someone else set on that unverified address is then removed, which blocks account pre-hijacking.
- **Sync:** the app keeps working offline. Changes upload in the background. If two phones edited at once, the server rejects the stale write and the app merges both copies: lists are joined by ID, deletions are respected, and each setting keeps its newest value.
- **Delete account** (Profile) erases the account and everything stored on the server, as the App Store requires.

### Setting up Google and Apple sign-in

Fill in the variables in `.env.example` on the server. The app reads them from `/api/auth/config` at runtime, so no rebuild is needed.

- **Google:** in Google Cloud Console create OAuth clients: *Web* (set `GOOGLE_WEB_CLIENT_ID`), *iOS* with bundle ID `com.caloriesdetector.app` (set `GOOGLE_IOS_CLIENT_ID`), and *Android* with your signing key's SHA-1 (add it to `GOOGLE_EXTRA_CLIENT_IDS`). For iOS, also add the iOS client's *reversed client ID* as a URL scheme in Xcode (Target → Info → URL Types).
- **Apple:** enable *Sign in with Apple* for the App ID (the Xcode project already has the entitlement). For the website and Android, create a *Services ID* and register `APPLE_REDIRECT_URL`. Apple sign-in on Android needs that redirect; without it the Android app offers Google and email.

## iOS & Android apps

The native apps reuse the same code and switch to native features when running on a phone:

| | iOS | Android |
|---|---|---|
| Camera / photo library | Native camera and Photos picker (`@capacitor/camera`) | Native camera and Android Photo Picker |
| Haptics | Taptic Engine | Vibration motor |
| Confirm dialogs | Native alert | Native dialog |
| Safe areas | Notch, Dynamic Island, home indicator | Edge-to-edge status and navigation bars |
| Back | Swipe sheets down | Hardware/gesture **Back** closes the top sheet, then returns to Today, then leaves the app |
| Data | Saved to localStorage and mirrored to UserDefaults so iOS can't evict it | Mirrored to SharedPreferences |
| Status bar | Follows light/dark mode | Follows light/dark mode |

### Build them

You need **Xcode** (on a Mac) for iOS, and **Android Studio** for Android.

```bash
npm install

# Photo recognition: the app calls your deployed server (see "Run it" below).
echo "VITE_API_URL=https://your-server.example.com" > .env.production.local

npm run ios        # build web, sync, open Xcode → pick a device → Run
npm run android    # build web, sync, open Android Studio → Run
npm run android:apk  # or build a debug APK from the command line
```

After changing web code, run `npm run cap:sync` (or the commands above) to copy it into the native projects.

For live reload on a real phone: `npm run dev`, then `CAP_SERVER_URL=http://<your-computer-ip>:5173 npx cap run android` (or `ios`).

To publish, set your own bundle ID in `capacitor.config.ts` (`appId`, currently `com.caloriesdetector.app`). Then sign in Xcode with your Apple Developer account, or create a release keystore in Android Studio (*Build → Generate Signed App Bundle*). Icons and splash screens are generated from `assets/` with `npx @capacitor/assets generate`.

### CI

`.github/workflows/mobile.yml` builds the web app, an Android debug APK and an iOS simulator build on every push. You can download the APK from the workflow run's **Artifacts** and install it on an Android phone. Set the repository variable `API_URL` (Settings → Secrets and variables → Actions → Variables) to bake your server address into those builds.

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

The server accepts requests from the iOS and Android apps (CORS for `capacitor://localhost` and `https://localhost`). Add other origins with `ALLOWED_ORIGINS=https://a.com,https://b.com`. Deploy it anywhere that runs Node (Render, Railway, Fly.io, a VPS) and use its HTTPS address as `VITE_API_URL` for the apps.

Everything except photo recognition works without a key. Search, plans and tracking run entirely in the browser, and your data is stored in `localStorage` on your device.

```bash
npm test         # calculation + database integrity tests
npm run test:e2e # user journeys on emulated iPhone 14, iPhone SE and Pixel 7
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
capacitor.config.ts      Native app config (bundle ID, system bars, splash)
ios/, android/           Native projects (generated by Capacitor, safe to edit)
assets/                  Icon and splash sources
src/lib/platform.ts      Native/web bridge: camera, haptics, dialogs, storage, back button
server/index.ts          Express app: photo analysis (Claude vision), static hosting
server/auth.ts           Sign-up, login, Google & Apple token verification, sessions
server/sync.ts           Per-user data document with conflict detection
server/db.ts             SQLite schema and queries
src/data/foods.ts        Food database
src/data/exercises.ts    Exercise & activity database
src/lib/nutrition.ts     Targets, health score, suitability, search
src/lib/fitness.ts       Session calories, plan generator
src/lib/diet.ts          Food recommendations & sample day
src/lib/store.ts         localStorage-backed state
src/screens/*            Today, Food, Train, Plan, Profile (+ onboarding)
src/components/*         Sheet, segmented control, rings, food/photo/meal sheets
```
