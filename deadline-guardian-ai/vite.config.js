import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Proxy all /api requests to the backend server (server/index.js).
    // This keeps the frontend same-origin in development, so the browser never
    // needs the Gemini key - it only ever calls our own /api/ai/* endpoints.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
