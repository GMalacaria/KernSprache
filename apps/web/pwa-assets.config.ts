import { defineConfig } from '@vite-pwa/assets-generator/config'

// PWA icons generated from public/favicon.svg: `pnpm --filter web icons`.
// The source already has its own background, so the corners and the padding are
// filled with the same colour (#F3F5FB). The maskable icon gets extra padding so
// that the speech bubble stays inside the circular safe zone.
const background = '#F3F5FB'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [192, 512], favicons: [] },
    maskable: { sizes: [512], padding: 0.3, resizeOptions: { background } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
})
