<p align="center"><img src="assets/icon.svg" width="128" height="128" alt="W app icon: a W lifting a barbell, with a flame"></p>

# W — Calories & Training

**W** is a calorie, training and fitness app. The logo is a **W** pressing a barbell overhead (training) with a flame at its heart (calories burned).

A mobile-first calorie and gym app with an Apple-style interface. It counts calories with a **search** (21,000+ foods, each with a picture), by **voice** or with a **barcode**, suggests **daily meal ideas** that learn what you like, tracks gym sessions with **clock in / clock out**, builds a **training split** (chest, back, arms, legs…) and a matching **meal plan**, and tells you whether a meal is **healthy and right for your goal**.

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
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/06-today.jpg" width="190" alt="Calories and steps rings, water, streak"><br><sub>Calories and steps rings, water, streak</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/12-water-cup.jpg" width="190" alt="Tap the cup to drink"><br><sub>Tap the cup to drink</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/13-sleep-clock.jpg" width="190" alt="Sleep on a 12-hour clock"><br><sub>Sleep on a 12-hour clock</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/14-calorie-target.jpg" width="190" alt="Set your own calorie target"><br><sub>Set your own calorie target</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/15-swipe-between-tabs.jpg" width="190" alt="Swipe between tabs"><br><sub>Swipe between tabs</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/07-today-meals.jpg" width="190" alt="Daily limits and meals"><br><sub>Daily limits and meals</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/08-edit-food.jpg" width="190" alt="Tap a food to fix or delete it"><br><sub>Tap a food to fix or delete it</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/09-meal-ideas.jpg" width="190" alt="Daily meal ideas"><br><sub>Daily meal ideas</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/10-meal-ideas-settings.jpg" width="190" alt="Meal ideas your way"><br><sub>Meal ideas your way</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/11-weekly-report.jpg" width="190" alt="Weekly report"><br><sub>Weekly report</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/18-progress-weight.jpg" width="190" alt="Weight chart and trend"><br><sub>Weight chart and trend</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/19-progress-water.jpg" width="190" alt="Water history"><br><sub>Water history</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/20-water-cup-size.jpg" width="190" alt="Your own cup or bottle size"><br><sub>Your own cup or bottle size</sub></td>
</tr></table>

#### Food: barcode and search

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/16-barcode-scanner.jpg" width="190" alt="Scan a barcode"><br><sub>Scan a barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/17-barcode-product.jpg" width="190" alt="Packaged food from its barcode"><br><sub>Packaged food from its barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/21-food.jpg" width="190" alt="Food home"><br><sub>Food home</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/22-food-search.jpg" width="190" alt="Search 21,000+ foods"><br><sub>Search 21,000+ foods</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/23-food-health-check.jpg" width="190" alt="Health grade and goal check"><br><sub>Health grade and goal check</sub></td>
</tr></table>

#### Dishes, halal, allergies and dislikes

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/24-customise-dish.jpg" width="190" alt="Change what's in a dish"><br><sub>Change what's in a dish</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/25-halal-filter.jpg" width="190" alt="Hides what you avoid"><br><sub>Hides what you avoid</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/26-halal-warning.jpg" width="190" alt="Halal / allergy warning"><br><sub>Halal / allergy warning</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/27-meal-builder.jpg" width="190" alt="Build your own meal"><br><sub>Build your own meal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/47-foods-i-dont-eat.jpg" width="190" alt="Foods you don't eat, left out of plans"><br><sub>Foods you don't eat, left out of plans</sub></td>
</tr></table>

#### Gym

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/28-train.jpg" width="190" alt="Train and personal records"><br><sub>Train and personal records</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/29-exercise-library.jpg" width="190" alt="An icon for every exercise"><br><sub>An icon for every exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/30-exercise-detail.jpg" width="190" alt="Real photos: start and end position"><br><sub>Real photos: start and end position</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/31-create-exercise.jpg" width="190" alt="Create your own exercise"><br><sub>Create your own exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/32-workout-rest-timer-record.jpg" width="190" alt="Rest timer, last time and a new record"><br><sub>Rest timer, last time and a new record</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/33-clock-out.jpg" width="190" alt="Clock out"><br><sub>Clock out</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/34-workout-done-records.jpg" width="190" alt="Share a workout"><br><sub>Share a workout</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/35-gym-tools.jpg" width="190" alt="Plates, 1-rep max, warm-ups"><br><sub>Plates, 1-rep max, warm-ups</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/36-run-tracker.jpg" width="190" alt="Run tracking on a street map"><br><sub>Run tracking on a street map</sub></td>
</tr></table>

#### Plan and body check

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/37-training-plan.jpg" width="190" alt="Training split"><br><sub>Training split</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/38-plan-press-and-hold.jpg" width="190" alt="Hold and drag to reorder your week"><br><sub>Hold and drag to reorder your week</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/39-exercise-from-plan.jpg" width="190" alt="Tap a plan exercise to see how"><br><sub>Tap a plan exercise to see how</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/40-nutrition-plan.jpg" width="190" alt="Calorie and macro targets"><br><sub>Calorie and macro targets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/41-sample-day.jpg" width="190" alt="A sample day to log"><br><sub>A sample day to log</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/42-meal-planner.jpg" width="190" alt="Weekly meal planner"><br><sub>Weekly meal planner</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/43-body-check-bmi.jpg" width="190" alt="BMI calculator"><br><sub>BMI calculator</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/44-body-check-advice.jpg" width="190" alt="What to train and eat"><br><sub>What to train and eat</sub></td>
</tr></table>

#### Profile, family, Ramadan and languages

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/45-profile.jpg" width="190" alt="Profile and appearance"><br><sub>Profile and appearance</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/46-profile-allergies-fasting.jpg" width="190" alt="Allergies, halal and fasting"><br><sub>Allergies, halal and fasting</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/48-profile-reminders-language.jpg" width="190" alt="Reminders, goals, language, export"><br><sub>Reminders, goals, language, export</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/52-switch-person.jpg" width="190" alt="Family members on one phone"><br><sub>Family members on one phone</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/68-swipe-photo-to-switch.jpg" width="190" alt="Swipe your photo down to switch person"><br><sub>Swipe your photo down to switch person</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/53-ramadan-today.jpg" width="190" alt="Ramadan: countdown to iftar"><br><sub>Ramadan: countdown to iftar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/54-ramadan-meals.jpg" width="190" alt="Sahur, Iftar and Moreh"><br><sub>Sahur, Iftar and Moreh</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/67-ramadan-haid.jpg" width="190" alt="Ramadan: haid days and fasts to replace"><br><sub>Ramadan: haid days and fasts to replace</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/55-language-malay.jpg" width="190" alt="Bahasa Melayu"><br><sub>Bahasa Melayu</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/56-language-chinese.jpg" width="190" alt="中文"><br><sub>中文</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/57-exercise-chinese.jpg" width="190" alt="Exercises in Chinese"><br><sub>Exercises in Chinese</sub></td>
</tr></table>

#### Cycle

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/49-profile-cycle.jpg" width="190" alt="Cycle tracking settings"><br><sub>Cycle tracking settings</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/50-cycle-today.jpg" width="190" alt="Cycle day, phase and tips"><br><sub>Cycle day, phase and tips</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/51-period-calendar.jpg" width="190" alt="Period calendar"><br><sub>Period calendar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/58-period-late-advice.jpg" width="190" alt="Advice when a period is late"><br><sub>Advice when a period is late</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/59-cycle-patterns-swaps.jpg" width="190" alt="Symptom heads-up and craving swaps"><br><sub>Symptom heads-up and craving swaps</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/60-cycle-symptoms.jpg" width="190" alt="Log flow and symptoms"><br><sub>Log flow and symptoms</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/61-cycle-history.jpg" width="190" alt="Cycle history and health check"><br><sub>Cycle history and health check</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/62-cycle-fertile-window.jpg" width="190" alt="Fertile window (not birth control)"><br><sub>Fertile window (not birth control)</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/63-cycle-pill.jpg" width="190" alt="Birth-control pill with break week"><br><sub>Birth-control pill with break week</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/64-cycle-training.jpg" width="190" alt="Training by cycle phase"><br><sub>Training by cycle phase</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/65-cycle-settings.jpg" width="190" alt="Cycle extras and privacy lock"><br><sub>Cycle extras and privacy lock</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/ios/66-cycle-privacy-lock.jpg" width="190" alt="PIN lock on a shared phone"><br><sub>PIN lock on a shared phone</sub></td>
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
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/06-today.jpg" width="190" alt="Calories and steps rings, water, streak"><br><sub>Calories and steps rings, water, streak</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/12-water-cup.jpg" width="190" alt="Tap the cup to drink"><br><sub>Tap the cup to drink</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/13-sleep-clock.jpg" width="190" alt="Sleep on a 12-hour clock"><br><sub>Sleep on a 12-hour clock</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/14-calorie-target.jpg" width="190" alt="Set your own calorie target"><br><sub>Set your own calorie target</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/15-swipe-between-tabs.jpg" width="190" alt="Swipe between tabs"><br><sub>Swipe between tabs</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/07-today-meals.jpg" width="190" alt="Daily limits and meals"><br><sub>Daily limits and meals</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/08-edit-food.jpg" width="190" alt="Tap a food to fix or delete it"><br><sub>Tap a food to fix or delete it</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/09-meal-ideas.jpg" width="190" alt="Daily meal ideas"><br><sub>Daily meal ideas</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/10-meal-ideas-settings.jpg" width="190" alt="Meal ideas your way"><br><sub>Meal ideas your way</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/11-weekly-report.jpg" width="190" alt="Weekly report"><br><sub>Weekly report</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/18-progress-weight.jpg" width="190" alt="Weight chart and trend"><br><sub>Weight chart and trend</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/19-progress-water.jpg" width="190" alt="Water history"><br><sub>Water history</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/20-water-cup-size.jpg" width="190" alt="Your own cup or bottle size"><br><sub>Your own cup or bottle size</sub></td>
</tr></table>

#### Food: barcode and search

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/16-barcode-scanner.jpg" width="190" alt="Scan a barcode"><br><sub>Scan a barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/17-barcode-product.jpg" width="190" alt="Packaged food from its barcode"><br><sub>Packaged food from its barcode</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/21-food.jpg" width="190" alt="Food home"><br><sub>Food home</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/22-food-search.jpg" width="190" alt="Search 21,000+ foods"><br><sub>Search 21,000+ foods</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/23-food-health-check.jpg" width="190" alt="Health grade and goal check"><br><sub>Health grade and goal check</sub></td>
</tr></table>

#### Dishes, halal, allergies and dislikes

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/24-customise-dish.jpg" width="190" alt="Change what's in a dish"><br><sub>Change what's in a dish</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/25-halal-filter.jpg" width="190" alt="Hides what you avoid"><br><sub>Hides what you avoid</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/26-halal-warning.jpg" width="190" alt="Halal / allergy warning"><br><sub>Halal / allergy warning</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/27-meal-builder.jpg" width="190" alt="Build your own meal"><br><sub>Build your own meal</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/47-foods-i-dont-eat.jpg" width="190" alt="Foods you don't eat, left out of plans"><br><sub>Foods you don't eat, left out of plans</sub></td>
</tr></table>

#### Gym

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/28-train.jpg" width="190" alt="Train and personal records"><br><sub>Train and personal records</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/29-exercise-library.jpg" width="190" alt="An icon for every exercise"><br><sub>An icon for every exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/30-exercise-detail.jpg" width="190" alt="Real photos: start and end position"><br><sub>Real photos: start and end position</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/31-create-exercise.jpg" width="190" alt="Create your own exercise"><br><sub>Create your own exercise</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/32-workout-rest-timer-record.jpg" width="190" alt="Rest timer, last time and a new record"><br><sub>Rest timer, last time and a new record</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/33-clock-out.jpg" width="190" alt="Clock out"><br><sub>Clock out</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/34-workout-done-records.jpg" width="190" alt="Share a workout"><br><sub>Share a workout</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/35-gym-tools.jpg" width="190" alt="Plates, 1-rep max, warm-ups"><br><sub>Plates, 1-rep max, warm-ups</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/36-run-tracker.jpg" width="190" alt="Run tracking on a street map"><br><sub>Run tracking on a street map</sub></td>
</tr></table>

#### Plan and body check

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/37-training-plan.jpg" width="190" alt="Training split"><br><sub>Training split</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/38-plan-press-and-hold.jpg" width="190" alt="Hold and drag to reorder your week"><br><sub>Hold and drag to reorder your week</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/39-exercise-from-plan.jpg" width="190" alt="Tap a plan exercise to see how"><br><sub>Tap a plan exercise to see how</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/40-nutrition-plan.jpg" width="190" alt="Calorie and macro targets"><br><sub>Calorie and macro targets</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/41-sample-day.jpg" width="190" alt="A sample day to log"><br><sub>A sample day to log</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/42-meal-planner.jpg" width="190" alt="Weekly meal planner"><br><sub>Weekly meal planner</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/43-body-check-bmi.jpg" width="190" alt="BMI calculator"><br><sub>BMI calculator</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/44-body-check-advice.jpg" width="190" alt="What to train and eat"><br><sub>What to train and eat</sub></td>
</tr></table>

#### Profile, family, Ramadan and languages

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/45-profile.jpg" width="190" alt="Profile and appearance"><br><sub>Profile and appearance</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/46-profile-allergies-fasting.jpg" width="190" alt="Allergies, halal and fasting"><br><sub>Allergies, halal and fasting</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/48-profile-reminders-language.jpg" width="190" alt="Reminders, goals, language, export"><br><sub>Reminders, goals, language, export</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/52-switch-person.jpg" width="190" alt="Family members on one phone"><br><sub>Family members on one phone</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/68-swipe-photo-to-switch.jpg" width="190" alt="Swipe your photo down to switch person"><br><sub>Swipe your photo down to switch person</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/53-ramadan-today.jpg" width="190" alt="Ramadan: countdown to iftar"><br><sub>Ramadan: countdown to iftar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/54-ramadan-meals.jpg" width="190" alt="Sahur, Iftar and Moreh"><br><sub>Sahur, Iftar and Moreh</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/67-ramadan-haid.jpg" width="190" alt="Ramadan: haid days and fasts to replace"><br><sub>Ramadan: haid days and fasts to replace</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/55-language-malay.jpg" width="190" alt="Bahasa Melayu"><br><sub>Bahasa Melayu</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/56-language-chinese.jpg" width="190" alt="中文"><br><sub>中文</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/57-exercise-chinese.jpg" width="190" alt="Exercises in Chinese"><br><sub>Exercises in Chinese</sub></td>
</tr></table>

#### Cycle

<table><tr>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/49-profile-cycle.jpg" width="190" alt="Cycle tracking settings"><br><sub>Cycle tracking settings</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/50-cycle-today.jpg" width="190" alt="Cycle day, phase and tips"><br><sub>Cycle day, phase and tips</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/51-period-calendar.jpg" width="190" alt="Period calendar"><br><sub>Period calendar</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/58-period-late-advice.jpg" width="190" alt="Advice when a period is late"><br><sub>Advice when a period is late</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/59-cycle-patterns-swaps.jpg" width="190" alt="Symptom heads-up and craving swaps"><br><sub>Symptom heads-up and craving swaps</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/60-cycle-symptoms.jpg" width="190" alt="Log flow and symptoms"><br><sub>Log flow and symptoms</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/61-cycle-history.jpg" width="190" alt="Cycle history and health check"><br><sub>Cycle history and health check</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/62-cycle-fertile-window.jpg" width="190" alt="Fertile window (not birth control)"><br><sub>Fertile window (not birth control)</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/63-cycle-pill.jpg" width="190" alt="Birth-control pill with break week"><br><sub>Birth-control pill with break week</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/64-cycle-training.jpg" width="190" alt="Training by cycle phase"><br><sub>Training by cycle phase</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/65-cycle-settings.jpg" width="190" alt="Cycle extras and privacy lock"><br><sub>Cycle extras and privacy lock</sub></td>
<td align="center" valign="top" width="200"><img src="docs/screenshots/android/66-cycle-privacy-lock.jpg" width="190" alt="PIN lock on a shared phone"><br><sub>PIN lock on a shared phone</sub></td>
</tr></table>

</details>

## Features

| | |
|---|---|
| **Food search** | 21,000+ foods: 4,821 core dishes and ingredients (per 100 g, from USDA, UK CoFID and the Malaysian Food Composition Database), including vegetables, fruits, meat and poultry cuts, seafood, dairy, grains and dishes from Asia, Europe, the Americas, the Middle East and Africa, with Malay and Chinese names for search, plus 8,026 more loaded on first search (Malaysian regional dishes, kuih, restaurant-chain menus such as McDonald's, KFC, Starbucks and Tealive, Malaysian supermarket brands, kopitiam and bubble-tea drinks, desserts, snacks, sauces, ready meals, vegetarian and fitness foods, dishes from every region, and 432 Indian ingredients from the Indian Food Composition Tables 2017), plus the full 8,789-food USDA SR28 database, across 26 cuisines and groups: Malaysian, Chinese, Japanese, Korean, Thai & Vietnamese, Indian, Middle Eastern, Italian, Mexican & Latin American, American & British, European and African & Caribbean, plus everyday staples. Typing 3+ letters also searches **Open Food Facts** (millions of packaged products, no key needed). |
| **Meal builder** | Combine any foods and quantities. See live totals, a health grade (A–E) and whether it fits your goal. Then log it or save it to reuse later. |
| **Custom foods** | Copy any nutrition label into *My Foods*. |
| **Health check** | Every food and meal gets a 0–100 score (protein and fibre per calorie versus sugar, saturated fat and sodium) plus a verdict against what you still have left today. |
| **Clock in / out** | A live timer and calorie counter for your gym session. Log sets (kg × reps), cardio minutes and volume. |
| **Exercise database** | 6,231 entries. 1,375 hand-picked strength, stretching, plyometric, Olympic and strongman exercises with muscles, equipment and form cues — 763 of them from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db) with step-by-step *How to do it* instructions — plus 4,292 variations of the main lifts (barbell, dumbbell, cable, machine, kettlebell, Smith machine, band or bodyweight; flat, incline or decline; wide, close, neutral or reverse grip; standing, seated or kneeling; one arm or leg at a time; paused, slow-tempo or 1½ reps), each named in English, Malay and Chinese, and 572 cardio, sport, class, dance, outdoor, water-sport, martial-art and everyday activities with MET values from the 2024 Compendium of Physical Activities. Not in the list? **Create your own exercise** (name, strength or cardio, main muscle, equipment or how hard it is, and a note): it gets calories like similar exercises, works with sets, rest timer, records and the Dynamic Island, shows up when swapping plan exercises for its muscle group, and can be renamed (past workouts follow) or deleted (past workouts stay). |
| **Body check (BMI)** | Enter your height and weight to get your BMI (body mass index) on an Asia-Pacific gauge and your healthy weight range. You also get a recommended goal, training split and cardio, calorie and protein targets, and foods to eat and limit. *Use this plan* applies it in one tap. |
| **? guides** | The round **?** button opens a menu of guides: a 13-step *Quick tour* plus a full guide for each part of the app (Today, Food, Train, Plan, Profile and family, and Cycle for women). Each step highlights the feature it explains, gliding smoothly from one to the next; steps for features you haven't set up are skipped. The quick tour opens once automatically after sign-up, and the guides work on every screen size. |
| **Training plans** | Body-part split (Chest / Back / Legs / Shoulders / Arms), Chest & Tri · Back & Bi · Legs, Push-Pull-Legs, Arnold split, Upper/Lower, Glutes & legs focus, Full Body, or **your own split** (pick the muscle groups for each day), for 2–6 days a week. Choose where you train (gym, dumbbells or home) and the plan only uses exercises you can do there. **Swap** any exercise for another that works the same muscles. Sets, reps, rest and RIR follow your goal and experience. **Press and hold** a day or an exercise and drag it to put your week (shoulders before legs…) and each day's exercises in your own order, and tap any exercise to see its pictures, muscles and how to do it. Start any day with one tap. |
| **Live Activity (iPhone)** | While clocked in, the workout shows on the Lock Screen and in the Dynamic Island (iPhone 14 Pro and newer): a running timer, the exercise in progress, sets and calories, and a rest countdown between sets. iOS 16.2 or newer. |
| **Nutrition plan** | Calorie target (Mifflin-St Jeor × activity, ±goal), protein/carb/fat targets, foods to eat and limit, a sample day scaled to your target, and tips on meal timing. Supports halal, vegetarian and vegan diets. |
| **Your own calorie target** | Keep the target worked out from your body and goal, or set your own on a slider or by typing it (Profile, or tap *Daily target* on Today). The suggestion stays in view with a one-tap *Use it*, a warning shows below a safe minimum, and protein, carbs, fat, meal ideas and meal plans all follow it. |
| **Barcode scanner** | Point the camera at a packaged food (EAN/UPC) or type the number. The product's nutrition comes from Open Food Facts; unknown products can be added as a new food. |
| **Daily meal ideas** | A card on Today suggests a real dish for each meal still ahead (breakfast, lunch, dinner, snack — or sahur, iftar and moreh), sized to the calories and protein you have left, with a reason ("38 g protein towards your 120 g goal", "You often have this"). **Log it** in one tap, **Another idea** to swap, 👍 to see a dish more often, 👎 to never see it again. Settings: style (balanced, high protein, lower carb, light, more plants), cuisines (Malaysian, Chinese, Indian, Japanese, Korean, Thai & Vietnamese, Western, Middle Eastern, Mexican, African & Caribbean…), variety (my usual foods, a mix, something new) and no spicy food. It learns from likes, swaps and what you log, and always respects allergies, halal, vegetarian, vegan and foods you don't eat. Works offline. |
| **Progress** | Log your weight and see a chart with your weekly trend and whether it's on pace for your goal. Water against a goal of ~35 ml per kg, and 7-day charts. Body measurements (waist, neck, hips, chest, arm, thigh) with a US Navy body-fat estimate and charts, and progress photos kept only on the phone with a before/after slider. |
| **Steps** | Counted by the phone's own motion sensor (no Apple Health or Google Fit needed), with a daily goal, shown as a ring beside the calorie ring; walking calories can be added to the day's budget. |
| **Faster logging** | Quick add (just calories), say or type a meal in English, Malay or Chinese ("dua roti canai dan teh tarik"), copy yesterday's meal with Undo, and starred favourites. Barcodes scanned once work offline. |
| **Daily habits** | Morning check-in — drag the moon and sun on a 12-hour sleep clock to your bedtime and wake-up, then mood and energy — with a sleep-and-training insight, and supplements or medicine with reminders and a tick-off list. |
| **Weekly report** | The last 7 days against your targets: averages, best and toughest day, workouts, water, steps and sleep, and the one thing to work on next week. |
| **Training tools** | Routines with supersets, warm-up sets, plate calculator, 1-rep max calculator, strength charts per lift, a 12-week workout calendar, and GPS run/walk tracking (see below). |
| **Meal planner** | Plan the week's meals, log a planned meal in one tap, and share a grocery list. |
| **Pregnancy & breastfeeding** | Raises calorie and protein targets by trimester and pauses any weight-loss deficit. |
| **Badges & challenges** | Badges for streaks, protein, water, workouts and runs; challenges such as 7 days hitting protein or a month without sugary drinks. |
| **Larger text** | Normal, large and extra large text sizes. |
| **Swipe between tabs** | Swipe left or right anywhere on a screen to go to the next or previous tab, as well as tapping the tab bar. It works like turning pages: the screens either side are laid out ahead of time just off the edge, so the next one moves in with your finger and simply settles into place when you let go. Scrolling, chip rows, swipe-to-delete and press-and-hold keep working as before. |
| **Streaks** | A logging streak on Today and a weekly gym streak in Progress. |
| **Reminders** | Meal, water and gym-day reminders at times you choose (in the iPhone and Android apps). |
| **Clock in/out from your watch** | Gym reminders carry a **Clock in** button and a running workout shows a **Clock out** button. Both appear on a paired **Apple Watch** or **Wear OS** watch, because the watch mirrors the phone's notifications. |
| **Rest timer** | Finishing a set starts a countdown from your plan's rest time (+15 s or skip). The phone and watch buzz when it's over, even with the screen off. |
| **Personal records & progressive overload** | Best lifts with estimated 1-rep max. Each exercise shows last time's sets and what to do today ("Hit 10 reps on every set — try 42.5 kg"), and plan workouts start pre-filled with that weight. A new record gets a toast. |
| **Halal & allergen filters** | Pick allergies (peanuts, tree nuts, shellfish, fish, milk, egg, gluten, soy, sesame). Foods that usually contain them — or pork and alcohol on a halal diet, or meat on a vegetarian one — are hidden from search (one tap shows them), flagged with a warning, and left out of your meal plan. |
| **Ramadan & 16:8 fasting** | Ramadan mode turns meals into Sahur, Iftar and Moreh, counts down to iftar or the end of sahur, uses a gentler 15% deficit, and builds a sample day around dates at iftar. 16:8 mode shows when your eating window opens and closes. |
| **Cycle tracking** | For women, off until turned on in Profile. Tap the days of each period on a **period calendar** (past ones too); W learns your cycle and period length, shows the cycle day and phase on Today with a training and food tip for that phase (e.g. heavier lifts in the follicular phase, iron-rich food during your period, a little extra appetite and water weight in the luteal phase), predicts the next period, shows the predicted days on the calendar, and offers a one-tap *Started today* when it's due or late. **When a period is late**, *What to do* explains what it can mean and what to do, by how late it is (a few days, 5+ days, 2+ weeks, 3 months), points out anything in your own logs that can delay a period (eating well under your target, quick weight loss, hard training, a low BMI, fasting, irregular cycles), lists other common reasons, and says when to see a doctor straight away. Optional reminder two days before and on the day. Estimates only — not medical advice or contraception. |
| **Flow and symptoms** | Log flow (spotting to heavy) and symptoms (cramps, headache, bloating, tender breasts, back pain, acne, tiredness, low mood, cravings, nausea) from the cycle card. Once a symptom comes at the same point in two or more cycles, W shows the pattern ("Headache: usually 2 days before your period") and gives a heads-up a day or two ahead. |
| **Food that helps** | Pick heavy flow or a symptom and a *Food that helps* card pops up, like the meal ideas: one food with its portion, calories and why it helps (iron-rich food with vitamin C for heavy flow, ginger and magnesium for cramps, plain food for nausea…), **Log it** in one tap or **Another idea** for the next one, 6–9 foods for each symptom. With several symptoms, the one just picked comes first and the others are a chip away. Each also says what to cut back on, and when to see a doctor instead (e.g. soaking through a pad every hour). Foods that clash with your diet or allergies are left out. |
| **Cycle history and health check** | Average cycle length, range and whether it's regular, a bar for each recent cycle, your symptom patterns, and *Worth mentioning to a doctor* when cycles are often under 21 or over 35 days, vary by 8+ days, periods last over 7 days, flow is heavy for several days, there's bleeding between periods or no period for 90 days. Cycles, flow and symptoms are included in the PDF report and CSV export. |
| **Fertile window** | Optional (Profile → Cycle): the estimated fertile days and likely ovulation on the calendar and the cycle card. Clearly an estimate, **not birth control**. |
| **Training and food by phase** | Train shows a tip for the phase (go by feel on period days, push in the follicular phase, steady in the luteal phase) and, around a period, *Start today's plan lighter (80%)*. Optionally +150 kcal a day in the luteal phase; meal ideas favour iron-rich dishes on period days; *Smart swaps* for cravings; period bands on the weight chart with a note on water weight. |
| **Birth-control pill** | Pack start, active days (21–28) and break or placebo days: Today shows the pack day with a *Taken* tick, or the break week, and a daily reminder that stays quiet during the break. |
| **Privacy lock** | A 4-digit PIN (stored only as a salted hash) hides the cycle card, calendar, pill and training tips on a shared phone. It locks again when you leave the app, after five minutes, or when someone else's profile is used. Forgot it? The only way in is to erase the cycle data. |
| **Ramadan: fasts to replace** | With Ramadan mode on, a period day shows *Not fasting today · haid*, sahur and iftar reminders rest, and the day is added to **Fasts to replace** (qada). Add fasts missed for illness or travel by hand, tick off each one you replace, and get a Sunday and Wednesday evening reminder to fast the next day. |
| **Run and walk tracking** | A real street map (OpenStreetMap) with your route drawn as you go, a blue dot for where you are and a GPS signal chip (*Waiting for GPS* / *Weak* / *OK* / *Good*). Distance, time, **pace now** (last 30 seconds), average pace and calories. Keeps tracking with the screen locked or the phone in your pocket (Android shows a *Run in progress* notification), on any tab, and even if the app is closed and reopened. **Auto-pause** stops the clock when you stand still. Readings are smoothed and poor or impossible ones dropped, so a straight road isn't counted as a zig-zag. The map needs internet; the route records without it and stays on your phone. |
| **Family members** | Several people can share one phone (Profile → People → *Add a person*). Each person has their own profile and photo, plan, food log, workouts, weight, water and cycle; theme and language are shared. Switch from Profile, or tap your photo on Today to see everyone. **Swipe your photo down** on Today to switch straight to the next person: their photo drops into place as you pull. |
| **Exercise pictures** | Every exercise has its own icon: a drawn figure of the movement for gym exercises (bench press, squat, deadlift, pull-up, curl, plank… 38 in all) and an icon of the sport for activities (badminton, futsal, swimming, boxing, yoga, gardening… 110 more). Tap an exercise to see real photos of its start and end position, fading into each other, for 1,000+ gym exercises (from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db)). Names, form tips and step-by-step instructions follow the app language (English, Malay, Chinese). |
| **Fix a mistake** | Tap any food you logged to change the amount (the calories follow), move it to another meal, or delete it. Swiping a food left, or tapping its bin, deletes it too. Every delete offers **Undo**. |
| **Foods I don't eat** | Tap a group (vegetables, beef, chicken, pork, lamb, seafood, mushrooms, spicy food) or type it your way — "I don't eat vege", "tak makan sayur", "不吃牛肉", "durian". The meal plan and food suggestions leave them out and make up the calories with other foods (fruit takes the place of vegetables). It's a preference, not an allergy, so those foods can still be searched and logged. |
| **Water your way** | Tap the cup to drink: the water drains as the cup is counted, then the cup fills back up. Hold it to take a cup back, or Undo. Each tap is your own cup or bottle size (100 ml to 1 L, or any amount you type), and a one-off amount can be added too. |
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
- **Pregnancy**: maintenance plus 340 kcal in the 2nd trimester, 452 kcal in the 3rd and 330 kcal while breastfeeding (Institute of Medicine), with no deficit.
- **Meal ideas**: what's left of the day's calories and protein is shared over the meals still ahead (breakfast 25 %, lunch 35 %, dinner 30 %, snack 10 %; snacks stay under 300 kcal). Dishes are scored on fit, protein, a nutrient-density score, your style and cuisines, and what you like, skip and log.
- **Walking**: about 0.5 kcal per kg of body weight per 1,000 steps.
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
src/lib/ideas.ts         Daily meal ideas (scoring, sizing, learning from likes and logs)
src/lib/store.ts         localStorage-backed state
src/screens/*            Today, Food, Train, Plan, Profile (+ onboarding)
src/components/*         Sheet, segmented control, rings, food/meal sheets
```

## Credits

- Exercise photos and instructions: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).
- Sport and activity icons: [Material Symbols](https://fonts.google.com/icons) (Apache 2.0), [Tabler Icons](https://tabler.io/icons) (MIT), [Lucide](https://lucide.dev) (ISC) and [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors (CC BY 3.0), via [react-icons](https://react-icons.github.io/react-icons/).
- Gym movement pictograms are drawn for W.
