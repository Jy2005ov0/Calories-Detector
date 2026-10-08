# Calories — Food & Training

A mobile-first calorie and gym app with an Apple-style interface. It counts calories from a **photo** or a **search**, tracks gym sessions with **clock in / clock out**, builds a **training split** (chest, back, arms, legs…) and a matching **meal plan**, and tells you whether a meal is **healthy and right for your goal**.

Runs on **iOS and Android** three ways:

- **Native apps** for the App Store and Google Play, built with [Capacitor](https://capacitorjs.com) (`ios/` and `android/`).
- **Installable web app (PWA)**. In Safari tap Share → *Add to Home Screen*; in Chrome tap ⋮ → *Install app*. It works offline.
- **Any mobile or desktop browser.**

## Install the app

### iPhone / iPad

**Quickest: add it to your Home Screen (no App Store needed)**

1. Open the app's web address in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open **Calories** from your Home Screen. It runs full screen and works offline.

**Native app from source (needs a Mac)**

1. Install **Xcode** from the Mac App Store and **Node.js 22**.
2. In Terminal:
   ```bash
   git clone https://github.com/jy2005ov0/calories-detector.git
   cd calories-detector
   npm install
   npm run ios
   ```
3. Xcode opens. Plug in your iPhone, choose it at the top of the window, then select the **App** target → **Signing & Capabilities** → choose your **Team** (a free Apple ID works).
4. Press **Run** (▶).
5. The first time, on the iPhone go to **Settings → General → VPN & Device Management**, tap your Apple ID and tap **Trust**.

With a free Apple ID the app has to be re-installed every 7 days. A paid Apple Developer account lets you share it through **TestFlight** or publish it on the App Store.

### Android

**Install the APK**

1. On your phone, open this repository's **[Releases](../../releases)** page and download the latest `calories-vX.Y.Z.apk`.
   (No release yet? Open the **Actions** tab → the latest green **Mobile apps** run → **Artifacts** → `calories-android-debug`. This needs you to be signed in to GitHub, and it downloads as a zip with the APK inside.)
2. Open the downloaded file. If Android asks, allow **Install unknown apps** for your browser or Files app.
3. Tap **Install**, then **Open**.

**Or add it to your Home Screen**

1. Open the app's web address in **Chrome**.
2. Tap **⋮** → **Install app** (or **Add to Home screen**).

**Native app from source**

1. Install **Android Studio** and **Node.js 22**.
2. Run:
   ```bash
   git clone https://github.com/jy2005ov0/calories-detector.git
   cd calories-detector
   npm install
   npm run android
   ```
3. Android Studio opens. Turn on **USB debugging** on your phone (Settings → About phone → tap **Build number** 7 times → Developer options → USB debugging), plug it in, choose it at the top and press **Run** (▶).

### For maintainers: publishing a download

Push a version tag and CI builds the APK and attaches it to a new GitHub Release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Photo recognition and accounts need the server running somewhere (see [Run it](#run-it)). Set the repository variable `API_URL` before tagging so the APK knows where your server is.

## Screenshots

iPhone in light mode. The Android set, in dark mode, is below it. Regenerate both with `npm run screenshots`.

#### First launch

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/01-intro-guide.jpg" width="190" alt="Welcome guide (with Skip)"><br><sub>Welcome guide (with Skip)</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/02-sign-in.jpg" width="190" alt="Sign in: Apple, Google or email"><br><sub>Sign in: Apple, Google or email</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/03-create-account.jpg" width="190" alt="Create an account"><br><sub>Create an account</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/04-onboarding-goal.jpg" width="190" alt="Set your goal"><br><sub>Set your goal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/05-guided-tour.jpg" width="190" alt="Step-by-step tour (? button)"><br><sub>Step-by-step tour (? button)</sub></td>
</tr></table>

#### Today

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/06-today.jpg" width="190" alt="Calories left, macros, burned"><br><sub>Calories left, macros, burned</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/07-today-meals.jpg" width="190" alt="Daily limits and meals"><br><sub>Daily limits and meals</sub></td>
</tr></table>

#### Food

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/08-photo-calories.jpg" width="190" alt="Calories from a photo"><br><sub>Calories from a photo</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/09-food.jpg" width="190" alt="Food home"><br><sub>Food home</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/10-food-search.jpg" width="190" alt="Search 700+ world foods"><br><sub>Search 700+ world foods</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/11-food-health-check.jpg" width="190" alt="Health grade and goal check"><br><sub>Health grade and goal check</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/12-customise-dish.jpg" width="190" alt="Change what's in a dish"><br><sub>Change what's in a dish</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/13-meal-builder.jpg" width="190" alt="Build your own meal"><br><sub>Build your own meal</sub></td>
</tr></table>

#### Gym

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/14-train.jpg" width="190" alt="Train"><br><sub>Train</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/15-exercise-library.jpg" width="190" alt="236 exercises and sports"><br><sub>236 exercises and sports</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/16-exercise-detail.jpg" width="190" alt="Calories per exercise"><br><sub>Calories per exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/17-workout-clocked-in.jpg" width="190" alt="Clocked in: live timer and sets"><br><sub>Clocked in: live timer and sets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/18-clock-out.jpg" width="190" alt="Clock out"><br><sub>Clock out</sub></td>
</tr></table>

#### Plan

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/19-training-plan.jpg" width="190" alt="Training split"><br><sub>Training split</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/20-nutrition-plan.jpg" width="190" alt="Calorie and macro targets"><br><sub>Calorie and macro targets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/21-sample-day.jpg" width="190" alt="A sample day to log"><br><sub>A sample day to log</sub></td>
</tr></table>

#### Body check & profile

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/22-body-check-bmi.jpg" width="190" alt="BMI calculator"><br><sub>BMI calculator</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/23-body-check-advice.jpg" width="190" alt="What to train and eat"><br><sub>What to train and eat</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/24-profile.jpg" width="190" alt="Profile and appearance"><br><sub>Profile and appearance</sub></td>
</tr></table>

<details>
<summary><b>Android · dark mode</b> (tap to open)</summary>

#### First launch

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/01-intro-guide.jpg" width="190" alt="Welcome guide (with Skip)"><br><sub>Welcome guide (with Skip)</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/02-sign-in.jpg" width="190" alt="Sign in: Apple, Google or email"><br><sub>Sign in: Apple, Google or email</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/03-create-account.jpg" width="190" alt="Create an account"><br><sub>Create an account</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/04-onboarding-goal.jpg" width="190" alt="Set your goal"><br><sub>Set your goal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/05-guided-tour.jpg" width="190" alt="Step-by-step tour (? button)"><br><sub>Step-by-step tour (? button)</sub></td>
</tr></table>

#### Today

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/06-today.jpg" width="190" alt="Calories left, macros, burned"><br><sub>Calories left, macros, burned</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/07-today-meals.jpg" width="190" alt="Daily limits and meals"><br><sub>Daily limits and meals</sub></td>
</tr></table>

#### Food

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/08-photo-calories.jpg" width="190" alt="Calories from a photo"><br><sub>Calories from a photo</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/09-food.jpg" width="190" alt="Food home"><br><sub>Food home</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/10-food-search.jpg" width="190" alt="Search 700+ world foods"><br><sub>Search 700+ world foods</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/11-food-health-check.jpg" width="190" alt="Health grade and goal check"><br><sub>Health grade and goal check</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/12-customise-dish.jpg" width="190" alt="Change what's in a dish"><br><sub>Change what's in a dish</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/13-meal-builder.jpg" width="190" alt="Build your own meal"><br><sub>Build your own meal</sub></td>
</tr></table>

#### Gym

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/14-train.jpg" width="190" alt="Train"><br><sub>Train</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/15-exercise-library.jpg" width="190" alt="236 exercises and sports"><br><sub>236 exercises and sports</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/16-exercise-detail.jpg" width="190" alt="Calories per exercise"><br><sub>Calories per exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/17-workout-clocked-in.jpg" width="190" alt="Clocked in: live timer and sets"><br><sub>Clocked in: live timer and sets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/18-clock-out.jpg" width="190" alt="Clock out"><br><sub>Clock out</sub></td>
</tr></table>

#### Plan

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/19-training-plan.jpg" width="190" alt="Training split"><br><sub>Training split</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/20-nutrition-plan.jpg" width="190" alt="Calorie and macro targets"><br><sub>Calorie and macro targets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/21-sample-day.jpg" width="190" alt="A sample day to log"><br><sub>A sample day to log</sub></td>
</tr></table>

#### Body check & profile

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/22-body-check-bmi.jpg" width="190" alt="BMI calculator"><br><sub>BMI calculator</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/23-body-check-advice.jpg" width="190" alt="What to train and eat"><br><sub>What to train and eat</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/24-profile.jpg" width="190" alt="Profile and appearance"><br><sub>Profile and appearance</sub></td>
</tr></table>

</details>

## Features

| | |
|---|---|
| **Photo calories** | Snap a meal with the camera, or pick one from your **photo library** (one tap from the *Photos* button on Today or the *Photo library* tile on Food). Claude vision lists each food, estimates the grams and works out the calories and macros. You can fix the grams before logging. |
| **Food search** | 713 built-in foods (per 100 g, from USDA, UK CoFID and the Malaysian Food Composition Database) across 26 cuisines and groups: Malaysian, Chinese, Japanese, Korean, Thai & Vietnamese, Indian, Middle Eastern, Italian, Mexican & Latin American, American & British, European and African & Caribbean, plus everyday staples. Typing 3+ letters also searches **Open Food Facts** (millions of packaged products, no key needed). |
| **Meal builder** | Combine any foods and quantities. See live totals, a health grade (A–E) and whether it fits your goal. Then log it or save it to reuse later. |
| **Custom foods** | Copy any nutrition label into *My Foods*. |
| **Health check** | Every food and meal gets a 0–100 score (protein and fibre per calorie versus sugar, saturated fat and sodium) plus a verdict against what you still have left today. |
| **Clock in / out** | A live timer and calorie counter for your gym session. Log sets (kg × reps), cardio minutes and volume. |
| **Exercise database** | 236 entries: 125 strength exercises with muscles, equipment and form cues, plus 111 cardio, sport, class and combat activities with MET values from the 2024 Compendium of Physical Activities. |
| **Body check (BMI)** | Enter your height and weight to get your BMI (body mass index) on an Asia-Pacific gauge and your healthy weight range. You also get a recommended goal, training split and cardio, calorie and protein targets, and foods to eat and limit. *Use this plan* applies it in one tap. |
| **? guide** | The round **?** button opens a 12-step guided tour that highlights each feature in turn. It opens once automatically after sign-up and works on every screen size. |
| **Training plans** | Body-part split (Chest / Back / Legs / Shoulders / Arms), Push-Pull-Legs, Upper/Lower or Full Body, set for 2–6 days a week. Sets, reps, rest and RIR follow your goal and experience. Start any day with one tap. |
| **Nutrition plan** | Calorie target (Mifflin-St Jeor × activity, ±goal), protein/carb/fat targets, foods to eat and limit, a sample day scaled to your target, and tips on meal timing. Supports halal, vegetarian and vegan diets. |
| **Barcode scanner** | Point the camera at a packaged food (EAN/UPC) or type the number. The product's nutrition comes from Open Food Facts; unknown products can be added as a new food. |
| **Progress** | Log your weight and see a chart with your weekly trend and whether it's on pace for your goal. Steps (typed in, or synced from **Apple Health / Health Connect** in the apps), water glasses against a goal of ~35 ml per kg, and 7-day charts. |
| **Streaks** | A logging streak on Today and a weekly gym streak in Progress. |
| **Reminders** | Meal, water and gym-day reminders at times you choose (in the iPhone and Android apps). |
| **Clock in/out from your watch** | Gym reminders carry a **Clock in** button and a running workout shows a **Clock out** button. Both appear on a paired **Apple Watch** or **Wear OS** watch, because the watch mirrors the phone's notifications. |
| **Rest timer** | Finishing a set starts a countdown from your plan's rest time (+15 s or skip). The phone and watch buzz when it's over, even with the screen off. |
| **Personal records & progressive overload** | Best lifts with estimated 1-rep max. Each exercise shows last time's sets and what to do today ("Hit 10 reps on every set — try 42.5 kg"), and plan workouts start pre-filled with that weight. A new record gets a toast. |
| **Halal & allergen filters** | Pick allergies (peanuts, tree nuts, shellfish, fish, milk, egg, gluten, soy, sesame). Foods that usually contain them — or pork and alcohol on a halal diet, or meat on a vegetarian one — are hidden from search (one tap shows them), flagged with a warning, and left out of your meal plan. |
| **Ramadan & 16:8 fasting** | Ramadan mode turns meals into Sahur, Iftar and Moreh, counts down to iftar or the end of sahur, uses a gentler 15% deficit, and builds a sample day around dates at iftar. 16:8 mode shows when your eating window opens and closes. |
| **AI coach** | Ask anything about food, portions or training. The coach (Claude) sees your targets, today's log, your plan and your recent workouts, answers in your language, and streams its reply. |
| **Export & share** | Export everything as CSV, or a 30-day PDF report for a coach or doctor. Share a finished workout as an image card. |
| **Languages** | English, Bahasa Melayu and 中文 (Simplified Chinese), switchable in Profile. |

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
| Health data | Steps and weight from Apple Health (HealthKit); weigh-ins are saved back | Steps and weight from Health Connect (Android 8+) |
| Reminders & rest timer | Local notifications, also shown on a paired Apple Watch | Local notifications, also shown on a paired Wear OS watch |
| Watch buttons | Clock in / Clock out buttons on the notification | Same, on the notification and the watch |
| Barcode scanner | Live camera scanning in the app | Live camera scanning in the app |
| Export & share | Share sheet (Files, AirDrop, WhatsApp…) | Android share sheet |
| Status bar | Follows light/dark mode | Follows light/dark mode |

> **About the watch:** there is no separate watch app. The watch shows the phone's notifications with their buttons, so you can clock in from a gym reminder and clock out from the "clocked in" notification on your wrist while the app is running in the background on your phone. A standalone watchOS / Wear OS app would be a separate project.

> **Health permissions:** the first time you tap *Sync from Apple Health / Health Connect* in Progress, the phone asks which data to share. On Android, Health Connect needs Android 8 or later (built in from Android 14; install it from the Play Store on older phones). Publishing to the App Store or Play Store with health access requires the privacy policy at `public/privacypolicy.html` to be hosted on your site.

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

`.github/workflows/mobile.yml` builds the web app, an Android debug APK and an iOS simulator build on every push. You can download the APK from the workflow run's **Artifacts** and install it on an Android phone. Pushing a `v*` tag also attaches the APK to a GitHub Release. Set the repository variable `API_URL` (Settings → Secrets and variables → Actions → Variables) to bake your server address into those builds.

## Run it

```bash
npm install
cp .env.example .env      # add ANTHROPIC_API_KEY to enable photo recognition and the AI coach
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
