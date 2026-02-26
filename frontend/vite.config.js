import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['myapp.local'],
    proxy: {
      '/api': {
        target: 'http://myapp.local',
        changeOrigin: true,
      },
    },
  },
});
