/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        surface: {
          950: '#060a12',
          900: '#0a0e17',
          800: '#111827',
          700: '#141d2b',
          600: '#1a2535',
          500: '#1e2d42',
          400: '#253349',
          300: '#2d3f5a',
          200: '#374b6a',
        },
        bullish:  '#00d09c',
        bearish:  '#ff5252',
        neutral:  '#94a3b8',
        warning:  '#f59e0b',
        accent:   '#a78bfa',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'gradient-bullish': 'linear-gradient(135deg, #00d09c22 0%, transparent 60%)',
        'gradient-bearish': 'linear-gradient(135deg, #ff525222 0%, transparent 60%)',
        'gradient-brand':   'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        'card-glass':       'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      boxShadow: {
        'glass':    '0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glow-green': '0 0 20px rgba(0,208,156,0.25)',
        'glow-red':   '0 0 20px rgba(255,82,82,0.25)',
        'glow-blue':  '0 0 20px rgba(59,130,246,0.3)',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':    'spin 2s linear infinite',
        'fade-in':      'fadeIn 0.35s ease-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'slide-right':  'slideRight 0.4s ease-out',
        'shimmer':      'shimmer 1.8s infinite',
        'ring-draw':    'ringDraw 1s ease-out forwards',
        'score-pulse':  'scorePulse 2s ease-in-out infinite',
        'float':        'float 4s ease-in-out infinite',
        'dot-blink':    'dotBlink 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        ringDraw: {
          '0%':   { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
        scorePulse: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        dotBlink: {
          '0%, 80%, 100%': { opacity: '0' },
          '40%':            { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
