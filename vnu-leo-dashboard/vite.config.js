import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [react(), tailwindcss(), cesium()],
  server: {
    fs: {
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
  define: {
    // Cesium expects this constant at runtime for static assets
    CESIUM_BASE_URL: JSON.stringify('/node_modules/cesium/Build/Cesium'),
  },
})