# Installing W

W isn't in the App Store or Google Play yet, so you install it yourself. It takes about 5 minutes on Android and about 15 minutes the first time on iPhone.

**Downloads** (always the newest version):

- Android: **[W.apk](https://github.com/Jy2005ov0/Calories-Detector/releases/latest/download/W.apk)**
- iPhone: **[W.ipa](https://github.com/Jy2005ov0/Calories-Detector/releases/latest/download/W.ipa)**
- All versions and release notes: **[Releases](https://github.com/Jy2005ov0/Calories-Detector/releases)**

Contents

- [Android](#android)
- [iPhone with Sideloadly (Windows or Mac, no Mac needed)](#iphone-with-sideloadly-windows-or-mac)
- [iPhone with AltStore](#iphone-with-altstore)
- [iPhone with Xcode (Mac)](#iphone-with-xcode-mac)
- [No install: web app on the Home Screen](#no-install-web-app-on-the-home-screen)
- [Updating to a new version](#updating-to-a-new-version)
- [Troubleshooting](#troubleshooting)

---

## Android

Needs Android 8.0 or later.

### 1. Download

On your phone, open **[W.apk](https://github.com/Jy2005ov0/Calories-Detector/releases/latest/download/W.apk)**. Chrome may warn that the file can be harmful — tap **Download anyway**. The app is built from this repository's source by GitHub Actions.

### 2. Install

1. Open the downloaded **W.apk** (from the download notification, or **Files → Downloads**).
2. If Android says *For your security, your phone is not allowed to install unknown apps from this source*, tap **Settings**, turn on **Allow from this source**, and go back.
3. Tap **Install**. If **Google Play Protect** says it doesn't recognise the app, tap **More details → Install anyway**. (It only says this because the app isn't from the Play Store.)
4. Tap **Open**.

### 3. First time

- **Notifications:** allow them when asked, so meal, water, gym and period reminders and the rest timer can buzz.
- **Battery:** **Settings → Apps → W → Battery → Unrestricted**. Some phones (Samsung, Xiaomi, Oppo, Huawei) otherwise stop reminders and the workout timer in the background.
- **Reminders arrive late?** **Settings → Apps → W → Alarms & reminders → Allow** (Android 12 and later).
- **Steps and weight from Health Connect:** in W go to **Profile → Progress → Sync from Health Connect** and allow *Steps* and *Weight*.

That's it. Android apps don't expire.

---

## iPhone with Sideloadly (Windows or Mac)

Needs iOS 15 or later, a computer, a USB cable and a free Apple ID. No Mac and no paid developer account needed.

Apple only lets apps from the App Store onto an iPhone, unless the app is signed with your own Apple ID. [Sideloadly](https://sideloadly.io) does that signing for you while it installs **W.ipa**.

### 1. Get the file

On your computer, download **[W.ipa](https://github.com/Jy2005ov0/Calories-Detector/releases/latest/download/W.ipa)**.

### 2. Install the tools

| Windows | Mac |
|---|---|
| Install **iTunes** and **iCloud** from Apple's website: [iTunes](https://www.apple.com/itunes/download/win64), [iCloud](https://support.apple.com/en-us/HT204283). **Not** the Microsoft Store versions — Sideloadly needs Apple's own drivers. Then install **[Sideloadly](https://sideloadly.io)**. | Install **[Sideloadly](https://sideloadly.io)**. |

iTunes and iCloud only provide the drivers. You don't need to sign in to them, and they can't install the app by themselves.

### 3. Connect the iPhone

Plug the iPhone in, unlock it and tap **Trust This Computer** (enter your passcode). iTunes (Windows) or Finder (Mac) should now show the phone.

### 4. Install W

1. Open **Sideloadly**.
2. Drag **W.ipa** onto the IPA icon on the left.
3. Check your iPhone is selected under **iDevice**.
4. Type your **Apple ID** email and press **Start**.
5. Enter your Apple ID password, and the two-factor code when your iPhone shows it. The password goes only to Apple. Many people use a spare Apple ID for sideloading.
6. Wait for **Done.** at the bottom of the window.

### 5. First time on the iPhone

1. **Developer Mode** (iOS 16 and later): **Settings → Privacy & Security → Developer Mode → On**, then **Restart** and tap **Turn On** after the restart. (The switch only appears after Sideloadly has installed an app once.)
2. **Trust your Apple ID:** **Settings → General → VPN & Device Management**, tap your Apple ID under *Developer App*, then **Trust** and **Trust** again.
3. Open **W** from the Home Screen. Allow notifications, camera and photos when asked.

### 6. Keep it working: renew every 7 days

A free Apple ID signs apps for **7 days**. After that W won't open (your data is still on the phone). To renew:

- **Manually:** connect the phone and press **Start** in Sideloadly again with the same **W.ipa** and the same Apple ID. Your data stays.
- **Automatically:** in Sideloadly's advanced options, turn on **Automatic refresh** (and Wi-Fi sync in iTunes/Finder). Sideloadly then renews W in the background while the computer is on and the phone is on the same Wi-Fi.

A paid Apple Developer account ($99/year) signs for a year instead.

### What works in a sideloaded build

Everything — camera, photo library, barcode scanner, reminders, rest timer, cycle tracking, family members, accounts and sync — **except** two things Apple only allows for apps signed by a paid developer account:

- **Sign in with Apple** — use email or Google instead.
- **Apple Health** (steps and weight sync) — type steps and weight in by hand.

---

## iPhone with AltStore

[AltStore](https://altstore.io) works like Sideloadly and refreshes the app over Wi-Fi by itself.

1. Install **AltServer** on your Windows PC or Mac (Windows also needs Apple's iTunes and iCloud, as above), and use it to install **AltStore** on the iPhone.
2. Get **W.ipa** onto the iPhone (AirDrop, iCloud Drive, or download it in Safari).
3. In AltStore, go to **My Apps → +** and pick **W.ipa**.
4. Do the [first-time steps](#5-first-time-on-the-iphone) above.
5. Keep AltServer running on the computer; AltStore refreshes W when the phone and computer are on the same Wi-Fi.

A free Apple ID can have **3 sideloaded apps** at a time, and AltStore counts as one of them.

---

## iPhone with Xcode (Mac)

For developers. Needs a Mac with Xcode and Node.js 22.

```bash
git clone https://github.com/Jy2005ov0/Calories-Detector.git
cd Calories-Detector
npm install
npm run ios
```

In Xcode, select the **App** target → **Signing & Capabilities** → choose your **Team** (a free Apple ID works), pick your iPhone at the top and press **Run** ▶. Then do the [first-time steps](#5-first-time-on-the-iphone). With a free Apple ID it also expires after 7 days; run it again from Xcode to renew.

---

## No install: web app on the Home Screen

If the server is deployed, W also runs as a web app that works offline:

- **iPhone (Safari):** open the web address → **Share** → **Add to Home Screen** → **Add**.
- **Android (Chrome):** open the web address → **⋮** → **Install app**.

It never expires, but reminders, Apple Health / Health Connect and the watch buttons need the installed app.

---

## Updating to a new version

Your data stays on the phone when you update. Download the newest file from the links at the top.

- **Android:** open the new **W.apk** and tap **Update**.
- **iPhone:** install the new **W.ipa** with Sideloadly or AltStore using the **same Apple ID**. It replaces the old version and keeps your data.

With an account (Profile → *Back up & sync*), your data is also in the cloud, so even a fresh install gets everything back when you log in.

---

## Troubleshooting

### Android

| Problem | Fix |
|---|---|
| **"App not installed"** or **"package conflicts with an existing package"** when updating | Versions before **v1.2.1** were each signed with a different key, so Android won't update them in place. Back up first (Profile → *Back up & sync*, or *Export data*), uninstall W, then install the new APK. From v1.2.1 on, updates install over the old version. |
| **"There was a problem parsing the package"** | The download didn't finish. Delete it and download **W.apk** again. Check your phone runs Android 8.0 or later. |
| **Blocked by Play Protect** | Tap **More details → Install anyway**. |
| **No Install button / "Install blocked"** | Allow **Install unknown apps** for the app you opened the APK from (Chrome or Files): **Settings → Apps → Special app access → Install unknown apps**. |
| **Reminders or the rest timer don't buzz** | Allow notifications, set **Battery → Unrestricted**, and allow **Alarms & reminders** (see [First time](#3-first-time)). |

### iPhone

| Problem | Fix |
|---|---|
| **"Untrusted Developer"** when opening W | **Settings → General → VPN & Device Management** → your Apple ID → **Trust**. |
| **No "Developer Mode" in Settings** | It appears only after an app has been sideloaded. Install with Sideloadly once, then look again under **Privacy & Security** (iOS 16+). |
| **W opens and closes straight away / "no longer available"** | The 7 days are up. Re-install the same **W.ipa** with Sideloadly using the same Apple ID; your data is kept. |
| **Sideloadly doesn't see the iPhone** (Windows) | Use iTunes and iCloud from **Apple's website**, not the Microsoft Store; unlock the phone and tap **Trust**; try another cable or USB port. |
| **Login or "Guru Meditation" errors in Sideloadly** | Check the Apple ID email and password, approve the two-factor prompt on the phone, and update Sideloadly. A spare Apple ID often helps. |
| **"Maximum number of apps"** | A free Apple ID allows 3 sideloaded apps at once. Remove one under **Settings → General → VPN & Device Management**, or delete an old sideloaded app. |
| **Sign in with Apple or Apple Health doesn't work** | Expected in sideloaded builds (see [What works](#what-works-in-a-sideloaded-build)). Use email or Google to sign in. |

### Both

| Problem | Fix |
|---|---|
| **Photo calories or the AI coach say they're not available** | These run on the W server, which needs to be deployed with an Anthropic API key (see [Run it](../README.md#run-it)). Food search, the barcode scanner, workouts and everything else work without it. |
| **Barcode scanner shows "camera not available"** | Allow the camera: iPhone **Settings → W → Camera**; Android **Settings → Apps → W → Permissions → Camera**. You can also type the barcode number. |
| **Lost data after reinstalling** | Data lives on the phone. Make an account (Profile → *Back up & sync*) so it's also in the cloud and comes back when you log in. |
