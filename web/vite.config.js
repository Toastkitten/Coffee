import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Coffee',
        short_name: 'Coffee',
        start_url: '/',
        display: 'standalone',
        theme_color: '#6b3828',
        background_color: '#ffffff',
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
            },
          },
        ],
      },
    }),
  ],
})
