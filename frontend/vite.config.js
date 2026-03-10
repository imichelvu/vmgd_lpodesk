import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    // Production output served by nginx at /var/www/leavedesk/dist
    outDir: 'dist',
    sourcemap: false,
  },

  server: {
    // Local dev server
    port: 5173,
    host: true,
    allowedHosts: ['leavedesk.vmgd.gov.vu', '6a14-202-80-43-49.ngrok-free.app'],
    proxy: {
      // Dev only — in production nginx proxies /api/* to the backend
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },

  preview: {
    // `npm run preview` — test the production build locally before deploying
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
