import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// The proxy below is DEV-ONLY. In production the Express server serves the built
// frontend and the /api routes from the same origin, so no proxy is involved.
export default defineConfig(({ mode }) => {
  // Read PORT from .env so the dev proxy targets whatever port the backend uses
  // (defaults to 8080 to match the production default; set PORT=3001 for dev).
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = `http://localhost:${env.PORT || 8080}`;

  return {
    plugins: [react()],
    base: '/',
    server: {
      port: 5173,
      open: true,
      // Keep the frontend same-origin in development, so the browser never needs
      // the Gemini key - it only ever calls our own /api/ai/* endpoints.
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
