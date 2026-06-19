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

iOS apps can **only** be built and submitted from a Mac with Xcode — this is an
Apple requirement, not a Spark one.

1. Install [Xcode](https://apps.apple.com/app/xcode/id497799835) and
   [CocoaPods](https://cocoapods.org) (`sudo gem install cocoapods`).
2. Clone this repo on the Mac and run `npm install`.
3. Build + open in Xcode:
   ```bash
   npm run cap:ios
   ```
4. In Xcode: pick a Signing Team (your Apple Developer account — $99/yr),
   set a unique Bundle Identifier if needed, then Run on a device/simulator.
5. To ship: Product → Archive → Distribute App → App Store Connect.

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
