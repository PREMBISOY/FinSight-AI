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
          50:  '#e7fbf8',
          100: '#c8f3ed',
          400: '#36c4b5',
          500: '#1fa99d',
          600: '#16857d',
          700: '#126961',
          900: '#123d3a',
        },
        surface: {
          900: '#07111f',
          800: '#0b1929',
          700: '#102235',
          600: '#142b40',
          500: '#1b354c',
          400: '#24445d',
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
