import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
     server: {
      // ✅ Add CORS headers to responses from the Vite dev server
      headers: {
        'Access-Control-Allow-Origin': '*',               // or your exact origin
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },

      // Optional: also keep a proxy so your browser never cross-origins in dev
      proxy: {
        '/api': {
          target: env.VITE_FIREBASE_API_BASE || 'http://localhost:5173',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          // If you want to force CORS headers on proxied responses too:
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['access-control-allow-origin'] = '*'
              proxyRes.headers['access-control-allow-methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
              proxyRes.headers['access-control-allow-headers'] = '*'
            })
          },
        },
      },
    },
  }
})
