import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // `prompt`, not `autoUpdate`: this app holds a form that can be half-filled with a
      // listing someone is on the phone about. A service worker that reloads the page by
      // itself would throw that away. The user is asked instead — see `useAppUpdate`.
      registerType: 'prompt',
      // No `includeAssets`: `globPatterns` below already sweeps up every png/svg in the
      // build, and listing them here too puts each icon in the precache manifest twice.

      manifest: {
        name: 'ঠিকানাঘর · ThikanaGhor',
        // Both scripts in the long name; the short one is what sits under the icon on a
        // home screen, where ~12 characters is all that survives.
        short_name: 'ঠিকানাঘর',
        description: 'জমি ও ফ্ল্যাটের রেফারেল ব্যবস্থাপনা — property referral dashboard',
        lang: 'bn',
        dir: 'ltr',
        start_url: '/dashboard',
        // Opening at the dashboard rather than `/`: `/` only redirects there, and the
        // redirect costs a visible frame on every cold launch.
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f7f5f2',
        theme_color: '#f7f5f2',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Separate files, not the same PNG listed twice: a maskable icon must bleed to
          // the edges, and declaring the rounded artwork as maskable gets it cropped
          // into a smaller rounded square — the "double rounded corner" look.
          {
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'পাইপলাইন', short_name: 'পাইপলাইন', url: '/pipeline' },
          { name: 'সম্পত্তি', short_name: 'সম্পত্তি', url: '/properties' },
        ],
      },

      workbox: {
        // The shell: JS, CSS, fonts, icons. Enough to launch offline and render the
        // app's own "you are offline" state instead of the browser's dinosaur.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Source maps are shipped for debugging but are pointless to precache, and they
        // are by far the largest files in the build.
        globIgnores: ['**/*.map'],

        /**
         * **No API response is ever cached.** This is deliberate and worth defending,
         * because caching them would make the app usable offline:
         *
         *  • Every `/api` response here is authenticated, and a Cache Storage entry
         *    outlives the session — it sits on disk after logout, which contradicts the
         *    "well secured for single-person use" requirement this app was built to.
         *  • The payloads are money. A commission total served from a stale cache looks
         *    identical to a live one, and there is no honest way to label it in a
         *    number the user is about to make a decision on.
         *
         * So `/api` is network-only: offline, requests fail and the UI shows the
         * offline state it already has (`useOnlineStatus`, `AppShell`). Wanting offline
         * *reads* is reasonable, but it is a feature with a data-at-rest design behind
         * it, not a caching flag.
         */
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],

        // Without this a stale worker can keep serving a build the user has already been
        // told to update away from.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },

      devOptions: {
        // Off in dev: a service worker caching module scripts fights HMR, and every
        // "why isn't my change showing" hour is spent here.
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  server: {
    port: 5173,
    /**
     * Proxying /api to the backend makes development same-origin, exactly like the
     * Vercel rewrite in production. That is the point: without it, dev would exercise
     * a cross-site cookie path production never uses, and cookie bugs would appear in
     * only one of the two environments.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },

  /**
   * `vite preview` needs the same proxy as dev, because it is the only way to exercise
   * the service worker locally — `devOptions.enabled` is off, so the SW exists solely in
   * a production build. Without this, previewing the built app would 404 every request
   * and the offline behaviour could not be checked before deploying.
   */
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },

  build: {
    sourcemap: true,
    // No manual chunk config. Route-level lazy() is the real splitting mechanism here,
    // and hand-tuning chunks before the app has any routes optimises nothing. Revisit
    // at F8 if the Recharts chunk turns out to be on the critical path.
  },
});
