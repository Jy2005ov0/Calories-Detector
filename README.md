<p align="center"><img src="assets/icon.svg" width="128" height="128" alt="W app icon: a W lifting a barbell, with a flame"></p>

# W — Calories & Training

**W** is a calorie, training and fitness app. The logo is a **W** pressing a barbell overhead (training) with a flame at its heart (calories burned).

A mobile-first calorie and gym app with an Apple-style interface. It counts calories with a **search** or a **barcode scan**, tracks gym sessions with **clock in / clock out**, builds a **training split** (chest, back, arms, legs…) and a matching **meal plan**, and tells you whether a meal is **healthy and right for your goal**.

Runs on **iOS and Android** three ways:

- **Native apps** for the App Store and Google Play, built with [Capacitor](https://capacitorjs.com) (`ios/` and `android/`).
- **Installable web app (PWA)**. In Safari tap Share → *Add to Home Screen*; in Chrome tap ⋮ → *Install app*. It works offline.
- **Any mobile or desktop browser.**

## Install

📖 **Full step-by-step guide, with troubleshooting: [docs/INSTALL.md](docs/INSTALL.md)**

The short version:

| | Android | iPhone |
|---|---|---|
| **Get the file** | **[W.apk](https://github.com/Jy2005ov0/Calories-Detector/releases/latest/download/W.apk)** from the [latest release](https://github.com/Jy2005ov0/Calories-Detector/releases/latest) | **[W.ipa](https://github.com/Jy2005ov0/Calories-Detector/releases/latest/download/W.ipa)** from the [latest release](https://github.com/Jy2005ov0/Calories-Detector/releases/latest) |
| **Install** | Open `W.apk` on the phone and allow **Install unknown apps** | **No Mac needed:** [Sideloadly](https://sideloadly.io) or [AltStore](https://altstore.io) on a Windows PC or Mac, with your Apple ID (or Xcode on a Mac). On Windows, iTunes and iCloud from Apple's website must be installed for the drivers, but they can't install the app by themselves. |
| **First time** | Allow notifications, and set **Battery → Unrestricted** so reminders and the workout timer keep working | Turn on **Developer Mode** and trust your Apple ID under **VPN & Device Management** |
| **Keep it** | Nothing to do — it doesn't expire | **Renew every 7 days** with a free Apple ID (Sideloadly or AltStore can do it automatically over Wi-Fi). Your data stays. |
| **Update** | Open the new `W.apk` → **Update** | Install the new `W.ipa` with the same Apple ID |
| **Works** | Everything | Everything (the app doesn't use Apple Health, so a free Apple ID is enough) |

No install at all: open the web app and use **Add to Home Screen** (Safari) or **Install app** (Chrome). See the [guide](docs/INSTALL.md#no-install-web-app-on-the-home-screen).

Building from source instead: `npm install`, then `npm run ios` (Xcode) or `npm run android` (Android Studio) — see [iOS & Android apps](#ios--android-apps).

### For maintainers: publishing a download

CI builds the Android APK and the unsigned iPhone IPA and attaches both to a GitHub Release, as `W.apk` / `W.ipa` (so the links above always point at the newest) and as versioned copies. The APK is always signed with the same key ([android/keystore](android/keystore/README.md)), so updates install over older versions.

- **From GitHub (no command line):** **Actions** → **Mobile apps** → **Run workflow**, type a version such as `v1.0.1` in *Publish a GitHub Release*, and run it.
- **From git:**
  ```bash
  git tag v1.0.1
  git push origin v1.0.1
  ```

W needs no server: everything runs on the phone. Food search online and barcode lookups use the free, public [Open Food Facts](https://world.openfoodfacts.org) database.

## Screenshots

iPhone in light mode. The Android set, in dark mode, is below it. Regenerate both with `npm run screenshots`.

#### First launch

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/01-intro-guide.jpg" width="190" alt="Welcome guide (with Skip)"><br><sub>Welcome guide (with Skip)</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/02-onboarding-welcome.jpg" width="190" alt="No sign-up: start here"><br><sub>No sign-up: start here</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/03-onboarding-about-you.jpg" width="190" alt="Your profile, with a photo"><br><sub>Your profile, with a photo</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/04-onboarding-goal.jpg" width="190" alt="Set your goal"><br><sub>Set your goal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/05-guided-tour.jpg" width="190" alt="Step-by-step tour (? button)"><br><sub>Step-by-step tour (? button)</sub></td>
</tr></table>

#### Today and progress

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/06-today.jpg" width="190" alt="Calories left, water, streak"><br><sub>Calories left, water, streak</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/07-today-meals.jpg" width="190" alt="Daily limits and meals"><br><sub>Daily limits and meals</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/10-progress-weight.jpg" width="190" alt="Weight chart and trend"><br><sub>Weight chart and trend</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/11-progress-water.jpg" width="190" alt="Water history"><br><sub>Water history</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/12-water-cup-size.jpg" width="190" alt="Your own cup or bottle size"><br><sub>Your own cup or bottle size</sub></td>
</tr></table>

#### Food: barcode and search

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/08-barcode-scanner.jpg" width="190" alt="Scan a barcode"><br><sub>Scan a barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/09-barcode-product.jpg" width="190" alt="Packaged food from its barcode"><br><sub>Packaged food from its barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/13-food.jpg" width="190" alt="Food home"><br><sub>Food home</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/14-food-search.jpg" width="190" alt="Search 11,000+ foods"><br><sub>Search 11,000+ foods</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/15-food-health-check.jpg" width="190" alt="Health grade and goal check"><br><sub>Health grade and goal check</sub></td>
</tr></table>

#### Dishes, halal, allergies and dislikes

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/16-customise-dish.jpg" width="190" alt="Change what's in a dish"><br><sub>Change what's in a dish</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/17-halal-filter.jpg" width="190" alt="Hides what you avoid"><br><sub>Hides what you avoid</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/18-halal-warning.jpg" width="190" alt="Halal / allergy warning"><br><sub>Halal / allergy warning</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/19-meal-builder.jpg" width="190" alt="Build your own meal"><br><sub>Build your own meal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/33-foods-i-dont-eat.jpg" width="190" alt="Foods you don't eat, left out of plans"><br><sub>Foods you don't eat, left out of plans</sub></td>
</tr></table>

#### Gym

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/20-train.jpg" width="190" alt="Train and personal records"><br><sub>Train and personal records</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/21-exercise-library.jpg" width="190" alt="An icon for every exercise"><br><sub>An icon for every exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/22-exercise-detail.jpg" width="190" alt="Real photos: start and end position"><br><sub>Real photos: start and end position</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/23-workout-rest-timer-record.jpg" width="190" alt="Rest timer, last time and a new record"><br><sub>Rest timer, last time and a new record</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/24-clock-out.jpg" width="190" alt="Clock out"><br><sub>Clock out</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/25-workout-done-records.jpg" width="190" alt="Share a workout"><br><sub>Share a workout</sub></td>
</tr></table>

#### Plan and body check

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/26-training-plan.jpg" width="190" alt="Training split"><br><sub>Training split</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/27-nutrition-plan.jpg" width="190" alt="Calorie and macro targets"><br><sub>Calorie and macro targets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/28-sample-day.jpg" width="190" alt="A sample day to log"><br><sub>A sample day to log</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/29-body-check-bmi.jpg" width="190" alt="BMI calculator"><br><sub>BMI calculator</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/30-body-check-advice.jpg" width="190" alt="What to train and eat"><br><sub>What to train and eat</sub></td>
</tr></table>

#### Profile, cycle, family, Ramadan and languages

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/31-profile.jpg" width="190" alt="Profile and appearance"><br><sub>Profile and appearance</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/32-profile-allergies-fasting.jpg" width="190" alt="Allergies, halal and fasting"><br><sub>Allergies, halal and fasting</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/34-profile-reminders-language.jpg" width="190" alt="Reminders, goals, language, export"><br><sub>Reminders, goals, language, export</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/35-profile-cycle.jpg" width="190" alt="Cycle tracking settings"><br><sub>Cycle tracking settings</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/36-cycle-today.jpg" width="190" alt="Cycle day, phase and tips"><br><sub>Cycle day, phase and tips</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/37-period-calendar.jpg" width="190" alt="Period calendar"><br><sub>Period calendar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/38-switch-person.jpg" width="190" alt="Family members on one phone"><br><sub>Family members on one phone</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/39-ramadan-today.jpg" width="190" alt="Ramadan: countdown to iftar"><br><sub>Ramadan: countdown to iftar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/40-ramadan-meals.jpg" width="190" alt="Sahur, Iftar and Moreh"><br><sub>Sahur, Iftar and Moreh</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/41-language-malay.jpg" width="190" alt="Bahasa Melayu"><br><sub>Bahasa Melayu</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/42-language-chinese.jpg" width="190" alt="中文"><br><sub>中文</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/43-exercise-chinese.jpg" width="190" alt="Exercises in Chinese"><br><sub>Exercises in Chinese</sub></td>
</tr></table>

<details>
<summary><b>Android · dark mode</b> (tap to open)</summary>

#### First launch

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/01-intro-guide.jpg" width="190" alt="Welcome guide (with Skip)"><br><sub>Welcome guide (with Skip)</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/02-onboarding-welcome.jpg" width="190" alt="No sign-up: start here"><br><sub>No sign-up: start here</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/03-onboarding-about-you.jpg" width="190" alt="Your profile, with a photo"><br><sub>Your profile, with a photo</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/04-onboarding-goal.jpg" width="190" alt="Set your goal"><br><sub>Set your goal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/05-guided-tour.jpg" width="190" alt="Step-by-step tour (? button)"><br><sub>Step-by-step tour (? button)</sub></td>
</tr></table>

#### Today and progress

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/06-today.jpg" width="190" alt="Calories left, water, streak"><br><sub>Calories left, water, streak</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/07-today-meals.jpg" width="190" alt="Daily limits and meals"><br><sub>Daily limits and meals</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/10-progress-weight.jpg" width="190" alt="Weight chart and trend"><br><sub>Weight chart and trend</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/11-progress-water.jpg" width="190" alt="Water history"><br><sub>Water history</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/12-water-cup-size.jpg" width="190" alt="Your own cup or bottle size"><br><sub>Your own cup or bottle size</sub></td>
</tr></table>

#### Food: barcode and search

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/08-barcode-scanner.jpg" width="190" alt="Scan a barcode"><br><sub>Scan a barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/09-barcode-product.jpg" width="190" alt="Packaged food from its barcode"><br><sub>Packaged food from its barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/13-food.jpg" width="190" alt="Food home"><br><sub>Food home</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/14-food-search.jpg" width="190" alt="Search 11,000+ foods"><br><sub>Search 11,000+ foods</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/15-food-health-check.jpg" width="190" alt="Health grade and goal check"><br><sub>Health grade and goal check</sub></td>
</tr></table>

#### Dishes, halal, allergies and dislikes

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/16-customise-dish.jpg" width="190" alt="Change what's in a dish"><br><sub>Change what's in a dish</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/17-halal-filter.jpg" width="190" alt="Hides what you avoid"><br><sub>Hides what you avoid</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/18-halal-warning.jpg" width="190" alt="Halal / allergy warning"><br><sub>Halal / allergy warning</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/19-meal-builder.jpg" width="190" alt="Build your own meal"><br><sub>Build your own meal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/33-foods-i-dont-eat.jpg" width="190" alt="Foods you don't eat, left out of plans"><br><sub>Foods you don't eat, left out of plans</sub></td>
</tr></table>

#### Gym

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/20-train.jpg" width="190" alt="Train and personal records"><br><sub>Train and personal records</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/21-exercise-library.jpg" width="190" alt="An icon for every exercise"><br><sub>An icon for every exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/22-exercise-detail.jpg" width="190" alt="Real photos: start and end position"><br><sub>Real photos: start and end position</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/23-workout-rest-timer-record.jpg" width="190" alt="Rest timer, last time and a new record"><br><sub>Rest timer, last time and a new record</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/24-clock-out.jpg" width="190" alt="Clock out"><br><sub>Clock out</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/25-workout-done-records.jpg" width="190" alt="Share a workout"><br><sub>Share a workout</sub></td>
</tr></table>

#### Plan and body check

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/26-training-plan.jpg" width="190" alt="Training split"><br><sub>Training split</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/27-nutrition-plan.jpg" width="190" alt="Calorie and macro targets"><br><sub>Calorie and macro targets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/28-sample-day.jpg" width="190" alt="A sample day to log"><br><sub>A sample day to log</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/29-body-check-bmi.jpg" width="190" alt="BMI calculator"><br><sub>BMI calculator</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/30-body-check-advice.jpg" width="190" alt="What to train and eat"><br><sub>What to train and eat</sub></td>
</tr></table>

#### Profile, cycle, family, Ramadan and languages

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/31-profile.jpg" width="190" alt="Profile and appearance"><br><sub>Profile and appearance</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/32-profile-allergies-fasting.jpg" width="190" alt="Allergies, halal and fasting"><br><sub>Allergies, halal and fasting</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/34-profile-reminders-language.jpg" width="190" alt="Reminders, goals, language, export"><br><sub>Reminders, goals, language, export</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/35-profile-cycle.jpg" width="190" alt="Cycle tracking settings"><br><sub>Cycle tracking settings</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/36-cycle-today.jpg" width="190" alt="Cycle day, phase and tips"><br><sub>Cycle day, phase and tips</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/37-period-calendar.jpg" width="190" alt="Period calendar"><br><sub>Period calendar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/38-switch-person.jpg" width="190" alt="Family members on one phone"><br><sub>Family members on one phone</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/39-ramadan-today.jpg" width="190" alt="Ramadan: countdown to iftar"><br><sub>Ramadan: countdown to iftar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/40-ramadan-meals.jpg" width="190" alt="Sahur, Iftar and Moreh"><br><sub>Sahur, Iftar and Moreh</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/41-language-malay.jpg" width="190" alt="Bahasa Melayu"><br><sub>Bahasa Melayu</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/42-language-chinese.jpg" width="190" alt="中文"><br><sub>中文</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/43-exercise-chinese.jpg" width="190" alt="Exercises in Chinese"><br><sub>Exercises in Chinese</sub></td>
</tr></table>

</details>

## Features

| | |
|---|---|
| **Food search** | 11,000+ foods: 2,560 hand-checked dishes and ingredients (per 100 g, from USDA, UK CoFID and the Malaysian Food Composition Database) plus the full 8,789-food USDA SR28 database, across 26 cuisines and groups: Malaysian, Chinese, Japanese, Korean, Thai & Vietnamese, Indian, Middle Eastern, Italian, Mexican & Latin American, American & British, European and African & Caribbean, plus everyday staples. Typing 3+ letters also searches **Open Food Facts** (millions of packaged products, no key needed). |
| **Meal builder** | Combine any foods and quantities. See live totals, a health grade (A–E) and whether it fits your goal. Then log it or save it to reuse later. |
| **Custom foods** | Copy any nutrition label into *My Foods*. |
| **Health check** | Every food and meal gets a 0–100 score (protein and fibre per calorie versus sugar, saturated fat and sodium) plus a verdict against what you still have left today. |
| **Clock in / out** | A live timer and calorie counter for your gym session. Log sets (kg × reps), cardio minutes and volume. |
| **Exercise database** | 1,939 entries: 1,375 strength, stretching, plyometric, Olympic and strongman exercises with muscles, equipment and form cues — 763 of them from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db) with step-by-step *How to do it* instructions — plus 572 cardio, sport, class, dance, outdoor, water-sport, martial-art and everyday activities with MET values from the 2024 Compendium of Physical Activities. |
| **Body check (BMI)** | Enter your height and weight to get your BMI (body mass index) on an Asia-Pacific gauge and your healthy weight range. You also get a recommended goal, training split and cardio, calorie and protein targets, and foods to eat and limit. *Use this plan* applies it in one tap. |
| **? guide** | The round **?** button opens a 12-step guided tour that highlights each feature in turn. It opens once automatically after sign-up and works on every screen size. |
| **Training plans** | Body-part split (Chest / Back / Legs / Shoulders / Arms), Push-Pull-Legs, Upper/Lower or Full Body, set for 2–6 days a week. Sets, reps, rest and RIR follow your goal and experience. Start any day with one tap. |
| **Nutrition plan** | Calorie target (Mifflin-St Jeor × activity, ±goal), protein/carb/fat targets, foods to eat and limit, a sample day scaled to your target, and tips on meal timing. Supports halal, vegetarian and vegan diets. |
| **Barcode scanner** | Point the camera at a packaged food (EAN/UPC) or type the number. The product's nutrition comes from Open Food Facts; unknown products can be added as a new food. |
| **Progress** | Log your weight and see a chart with your weekly trend and whether it's on pace for your goal. Water against a goal of ~35 ml per kg, and 7-day charts. (W doesn't count steps: Apple Health can't be used by sideloaded apps.) |
| **Streaks** | A logging streak on Today and a weekly gym streak in Progress. |
| **Reminders** | Meal, water and gym-day reminders at times you choose (in the iPhone and Android apps). |
| **Clock in/out from your watch** | Gym reminders carry a **Clock in** button and a running workout shows a **Clock out** button. Both appear on a paired **Apple Watch** or **Wear OS** watch, because the watch mirrors the phone's notifications. |
| **Rest timer** | Finishing a set starts a countdown from your plan's rest time (+15 s or skip). The phone and watch buzz when it's over, even with the screen off. |
| **Personal records & progressive overload** | Best lifts with estimated 1-rep max. Each exercise shows last time's sets and what to do today ("Hit 10 reps on every set — try 42.5 kg"), and plan workouts start pre-filled with that weight. A new record gets a toast. |
| **Halal & allergen filters** | Pick allergies (peanuts, tree nuts, shellfish, fish, milk, egg, gluten, soy, sesame). Foods that usually contain them — or pork and alcohol on a halal diet, or meat on a vegetarian one — are hidden from search (one tap shows them), flagged with a warning, and left out of your meal plan. |
| **Ramadan & 16:8 fasting** | Ramadan mode turns meals into Sahur, Iftar and Moreh, counts down to iftar or the end of sahur, uses a gentler 15% deficit, and builds a sample day around dates at iftar. 16:8 mode shows when your eating window opens and closes. |
| **Cycle tracking** | For women, off until turned on in Profile. Tap the days of each period on a **period calendar** (past ones too); W learns your cycle and period length, shows the cycle day and phase on Today with a training and food tip for that phase (e.g. heavier lifts in the follicular phase, iron-rich food during your period, a little extra appetite and water weight in the luteal phase), predicts the next period, shows the predicted days on the calendar, and offers a one-tap *Started today* when it's due or late. Optional reminder two days before and on the day. Estimates only — not medical advice or contraception. |
| **Family members** | Several people can share one phone (Profile → People → *Add a person*). Each person has their own profile and photo, plan, food log, workouts, weight, water and cycle; theme and language are shared. Switch from Profile or the avatar on Today. |
| **Exercise pictures** | Every exercise has its own icon: a drawn figure of the movement for gym exercises (bench press, squat, deadlift, pull-up, curl, plank… 38 in all) and an icon of the sport for activities (badminton, futsal, swimming, boxing, yoga, gardening… 110 more). Tap an exercise to see real photos of its start and end position, fading into each other, for 1,000+ gym exercises (from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db)). Names, form tips and step-by-step instructions follow the app language (English, Malay, Chinese). |
| **Fix a mistake** | Tap any food you logged to change the amount (the calories follow), move it to another meal, or delete it. Swiping a food left, or tapping its bin, deletes it too. Every delete offers **Undo**. |
| **Foods I don't eat** | Tap a group (vegetables, beef, chicken, pork, lamb, seafood, mushrooms, spicy food) or type it your way — "I don't eat vege", "tak makan sayur", "不吃牛肉", "durian". The meal plan and food suggestions leave them out and make up the calories with other foods (fruit takes the place of vegetables). It's a preference, not an allergy, so those foods can still be searched and logged. |
| **Water your way** | Each tap adds your own cup or bottle size (100 ml to 1 L, or any amount you type), and a one-off amount can be added too. |
| **No sign-up** | Create a profile (with an optional picture from your photo library) and start — no email or password. Data stays on the phone. |
| **Backup & restore** | Save everyone's data to one file and restore it on a new phone, from Profile or the first setup page. |
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

## No sign-up, data on the phone

There are no accounts. On first launch you go from the short guide straight to creating your profile: name, sex, age, height, weight, an optional **profile picture** from the photo library, then goal, activity, experience and diet. Everything is stored on the phone (and in iOS/Android storage the OS doesn't clear) and works offline.

- **Back up to a file** (Profile → Data) saves everyone's data — every family member's profile, photo, logs, workouts, weight and cycle — into one `W-backup-YYYY-MM-DD.json` file, shared or saved wherever you like.
- **Restore from a file** brings a backup back, from Profile or from the first setup page on a new phone ("Have a backup? Restore it"), so moving phones doesn't mean starting over.
- **Export data (CSV)** and the **30-day report (PDF)** are for spreadsheets, a coach or a doctor.
- **Delete all data** wipes the phone and starts profile setup again.

Nothing is sent to a server. The only network requests are Open Food Facts searches and barcode lookups.

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
| Reminders & rest timer | Local notifications, also shown on a paired Apple Watch | Local notifications, also shown on a paired Wear OS watch |
| Watch buttons | Clock in / Clock out buttons on the notification | Same, on the notification and the watch |
| Barcode scanner | Live camera scanning in the app | Live camera scanning in the app |
| Export & share | Share sheet (Files, AirDrop, WhatsApp…) | Android share sheet |
| Status bar | Follows light/dark mode | Follows light/dark mode |

> **About the watch:** there is no separate watch app. The watch shows the phone's notifications with their buttons, so you can clock in from a gym reminder and clock out from the "clocked in" notification on your wrist while the app is running in the background on your phone. A standalone watchOS / Wear OS app would be a separate project.

### Build them

You need **Xcode** (on a Mac) for iOS, and **Android Studio** for Android.

```bash
npm install

npm run ios        # build web, sync, open Xcode → pick a device → Run
npm run android    # build web, sync, open Android Studio → Run
npm run android:apk  # or build a debug APK from the command line
```

After changing web code, run `npm run cap:sync` (or the commands above) to copy it into the native projects.

For live reload on a real phone: `npm run dev`, then `CAP_SERVER_URL=http://<your-computer-ip>:5173 npx cap run android` (or `ios`).

To publish, set your own bundle ID in `capacitor.config.ts` (`appId`, currently `com.caloriesdetector.app`). Then sign in Xcode with your Apple Developer account, or create a release keystore in Android Studio (*Build → Generate Signed App Bundle*). Icons and splash screens are generated from `assets/` with `npx @capacitor/assets generate`.

### CI

`.github/workflows/mobile.yml` builds the web app, runs the tests and user journeys, and builds an Android APK and an unsigned iPhone IPA on every push. Both can be downloaded from the workflow run's **Artifacts**. Pushing a `v*` tag also attaches them to a GitHub Release.

## Run it

```bash
npm install
npm run dev               # http://localhost:5173
```

Production: `npm run build` makes a static site in `dist/` that any static host can serve (`npm start` previews it). There is no server or API key: search, plans and tracking run entirely on the device, and your data is stored on the device.

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

This is general guidance, not medical advice.

## Project layout

```
capacitor.config.ts      Native app config (bundle ID, system bars, splash)
ios/, android/           Native projects (generated by Capacitor, safe to edit)
assets/                  Icon and splash sources
src/lib/platform.ts      Native/web bridge: camera, haptics, dialogs, storage, back button
src/data/foods.ts        Food database
src/data/exercises.ts    Exercise & activity database
src/lib/nutrition.ts     Targets, health score, suitability, search
src/lib/fitness.ts       Session calories, plan generator
src/lib/diet.ts          Food recommendations & sample day
src/lib/store.ts         localStorage-backed state
src/screens/*            Today, Food, Train, Plan, Profile (+ onboarding)
src/components/*         Sheet, segmented control, rings, food/meal sheets
```

## Credits

- Exercise photos and instructions: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).
- Sport and activity icons: [Material Symbols](https://fonts.google.com/icons) (Apache 2.0), [Tabler Icons](https://tabler.io/icons) (MIT), [Lucide](https://lucide.dev) (ISC) and [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors (CC BY 3.0), via [react-icons](https://react-icons.github.io/react-icons/).
- Gym movement pictograms are drawn for W.
