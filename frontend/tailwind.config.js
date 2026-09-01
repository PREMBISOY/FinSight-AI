/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6fd',
          100: '#dceeff',
          400: '#5c9fdb',
          500: '#387ed1',
          600: '#2f72c1',
          700: '#2764aa',
          900: '#174a80',
        },
        surface: {
          900: '#ffffff',
          800: '#ffffff',
          700: '#ffffff',
          600: '#fafafa',
          500: '#f5f5f5',
          400: '#e9e9e9',
        },
        bullish: '#22c55e',
        bearish: '#ef4444',
        neutral: '#94a3b8',
        warning: '#f59e0b',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
