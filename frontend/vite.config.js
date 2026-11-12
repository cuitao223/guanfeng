import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import postcssPxToRem from 'postcss-pxtorem'

function resolveHarnessWidget(root, folder) {
  const candidates = [
    path.resolve(root, './.harness/frontend/widgets', folder),
    path.resolve(root, '../.harness/frontend/widgets', folder)
  ]
  return candidates.find((item) => fs.existsSync(item)) || candidates[0]
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const proxy = { '/api/wb': { target: process.env.GUANFENG_BACKEND_URL || 'http://127.0.0.1:18180', changeOrigin: true } }
  if (env.VITE_APP_BASE_API && env.VITE_APP_BASE_URL) {
    proxy[env.VITE_APP_BASE_API] = {
      target: env.VITE_APP_BASE_URL,
      changeOrigin: true
    }
  }
  return {
    plugins: [vue()],
    resolve: {
      dedupe: ['vue', 'vue-router', 'element-plus', 'd3', 'leaflet', 'three'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@leice-charts': resolveHarnessWidget(__dirname, 'leice-charts'),
        '@leice-map-2d': resolveHarnessWidget(__dirname, 'leice-map-2d'),
        '@leice-map-3d': resolveHarnessWidget(__dirname, 'leice-map-3d')
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    css: {
      postcss: {
        plugins: [
          postcssPxToRem({ rootValue: 80, propList: ['*'], minPixelValue: 2 })
        ]
      }
    },
    preview: { proxy },
    server: {
      host: true,
      fs: {
        // 绘图和地图组件位于上层 .harness 目录，需要加入 Vite 的访问白名单
        allow: [path.resolve(__dirname), path.resolve(__dirname, '..')]
      },
      proxy
    }
  }
})
