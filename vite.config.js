import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Web build (GitHub Pages) is served from /base/. The native app (Capacitor)
// loads files from the device root, so use a relative base there.
// Set CAP_BUILD=1 when building for iOS/Android.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.CAP_BUILD ? './' : '/base/',
})
