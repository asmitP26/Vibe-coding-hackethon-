/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(2,6,23,0.04), 0 18px 40px -24px rgba(2,6,23,0.28)',
        soft: '0 10px 30px -12px rgba(2,6,23,0.12)',
        glow: '0 12px 40px -10px rgba(37,99,235,0.45)',
        glass: '0 8px 32px -8px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.65)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '70%,100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        drift: {
          '0%,100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(24px, -20px) scale(1.06)' },
          '66%': { transform: 'translate(-18px, 14px) scale(0.96)' },
        },
        driftAlt: {
          '0%,100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-26px, 18px) scale(1.08)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%,100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.08)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
        drift: 'drift 22s ease-in-out infinite',
        'drift-slow': 'driftAlt 30s ease-in-out infinite',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'page-in': 'pageIn 0.45s cubic-bezier(0.22,1,0.36,1) both',
        glow: 'glowPulse 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
