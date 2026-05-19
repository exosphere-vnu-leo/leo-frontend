import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cesium({
      // Workspaces: Cesium được hoist lên root node_modules
      cesiumBuildRootPath: path.join(repoRoot, 'node_modules/cesium/Build'),
      cesiumBuildPath: path.join(repoRoot, 'node_modules/cesium/Build/Cesium/'),
      cesiumBaseUrl: 'cesium/'
    })
  ]
})