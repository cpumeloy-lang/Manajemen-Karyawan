import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProd = mode === 'production';

    return {
      server: {
        port: 3030,
        host: '0.0.0.0',
        proxy: {
          '/api/': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            rewrite: (path) => path,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      preview: {
        port: 3030,
      },
      esbuild: isProd ? {
        drop: ['console', 'debugger'],
      } : undefined,
      build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-supabase': ['@supabase/supabase-js'],
              'vendor-charts': ['recharts'],
              'vendor-xlsx': ['xlsx'],
              'vendor-zustand': ['zustand'],
              'vendor-faceapi': ['face-api.js'],
            },
          },
        },
      },
    };
});
