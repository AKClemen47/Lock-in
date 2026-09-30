import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cocon — study & focus',
        short_name: 'Cocon',
        description: 'Pomodoro timer, tasks and immersive ambiences for studying.',
        lang: 'en',
        start_url: '.',
        display: 'standalone',
        theme_color: '#1b1830',
        background_color: '#12111c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'] },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
