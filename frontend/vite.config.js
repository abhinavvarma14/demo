import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'BatPrint',
        short_name: 'BatPrint',
        description: 'Campus Printing Service',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/batman.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/batman.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})