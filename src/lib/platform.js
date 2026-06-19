import { Capacitor } from '@capacitor/core';

// True when running inside the packaged native iOS/Android app (Capacitor),
// as opposed to a normal web browser. Used to force the phone-style layout
// (bottom tab bar) everywhere in the app, even on wide screens like iPad.
export function isNativeApp() {
  return Capacitor?.isNativePlatform?.() === true;
}
