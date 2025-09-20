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
    // server: {
    //   // ✅ Add CORS headers to responses from the Vite dev server
    //   headers: {
    //     'Access-Control-Allow-Origin': '*',               // or your exact origin
    //     'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    //     'Access-Control-Allow-Headers': '*',
    //   },

    //   // Optional: also keep a proxy so your browser never cross-origins in dev
    //   proxy: {
    //     '/ml': {
    //       target: env.VITE_ML_API_BASE || 'http://localhost:8000',
    //       changeOrigin: true,
    //       secure: false,
    //       // keep path as-is under /ml
    //     },
    //   },
    // },
  }
})
