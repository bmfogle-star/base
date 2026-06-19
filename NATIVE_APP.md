# Spark — Native App (iOS / Android) Setup

The web app is now wrapped with **Capacitor**, so the exact same React code ships
as a real App Store / Play Store app. The big win: the native app can read the
device's contacts directly (with a permission prompt) — the seamless
"tap Import → auto-fill name, phone, email, company, birthday" flow that
Apple blocks for web apps.

## What's already set up (in this repo)

- `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, and
  `@capacitor-community/contacts` installed.
- `capacitor.config.json` — app id `com.spark.crm`, name **Spark**.
- `ios/` and `android/` native projects generated and committed.
- Contacts permission strings added:
  - iOS: `NSContactsUsageDescription` in `ios/App/App/Info.plist`
  - Android: `READ_CONTACTS` in `android/app/src/main/AndroidManifest.xml`
- `src/lib/vcard.js` detects the native app and uses the device Contacts
  framework; on the web it falls back to the Android Contact Picker / `.vcf` upload.
- npm scripts: `build:native`, `cap:sync`, `cap:ios`, `cap:android`.

## Build the iOS app (requires a Mac)

iOS apps can **only** be built from a Mac with Xcode — this is an Apple
requirement. Good news: this project uses **Swift Package Manager**, so there's
**no CocoaPods to install**, and running on the **iOS Simulator is free** (no
Apple Developer account needed — you only need that for a physical device or
the App Store).

**Fastest path — see it in the Simulator (free):**
1. Install [Xcode](https://apps.apple.com/app/xcode/id497799835) from the Mac App Store.
2. Install [Node.js](https://nodejs.org) (LTS) if you don't have it.
3. Clone this repo and check out the branch:
   ```bash
   git clone <your-repo-url> spark && cd spark
   git checkout claude/stoic-babbage-y8jhtg
   npm install
   ```
4. Build the web app, sync it into iOS, and open Xcode:
   ```bash
   npm run cap:ios
   ```
5. In Xcode, pick an iPhone simulator in the top toolbar (e.g. "iPhone 16"),
   then press the ▶ Run button. The app launches in the simulator — splash
   screen, bottom tab bar, contacts import, the works.

**To run on your own iPhone / submit to the App Store:**
- Plug in your iPhone (or keep the simulator), then in Xcode select the **App**
  target → **Signing & Capabilities** → choose your **Team** (a free Apple ID
  works for on-device testing; a paid Apple Developer account — $99/yr — is
  required to ship to the App Store).
- Set a unique Bundle Identifier if Xcode flags a conflict.
- Run on the device, or **Product → Archive → Distribute App → App Store Connect**.

## Build the Android app

1. Install [Android Studio](https://developer.android.com/studio).
2. `npm run cap:android` (builds the web app and opens Android Studio).
3. Run on an emulator/device, or Build → Generate Signed Bundle for the Play Store.

## Day-to-day workflow

Whenever you change the web app, re-sync the native projects:

```bash
npm run cap:sync       # build + copy into ios/ and android/
```

Then re-run from Xcode / Android Studio.

## Notes

- The web (GitHub Pages) build is unaffected — `npm run build` still targets
  `/base/`. Native builds use `CAP_BUILD=1` for a relative asset base.
- App icons & splash screens: drop source art in and use
  [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) to generate
  all sizes (not set up yet — easy to add when you have a logo PNG).
