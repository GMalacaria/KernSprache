import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Own ports instead of Vite's defaults (5173/4173), which other projects on the same machine use too.
// strictPort: fail if the port is taken instead of silently moving to another one, so the
// address always matches site_url and the redirect URLs in supabase/config.toml.
export default defineConfig({
  server: { port: 5273, strictPort: true },
  preview: { port: 4273, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      // Custom service worker (src/sw/sw.ts) so we can handle push events.
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Kern Sprache',
        short_name: 'Kern Sprache',
        description: 'Il tuo tutor personale per imparare le lingue',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2446d8',
        background_color: '#f3f5fb',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
