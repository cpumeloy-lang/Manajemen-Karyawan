/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#06736a',
          light:   '#e6f3f2',
          dark:    '#054f46',
          hover:   '#089c8e',
          50:  '#e6f3f2',
          100: '#c0e3e0',
          200: '#8cccc6',
          300: '#4fb5ac',
          400: '#1a9f94',
          500: '#06736a',
          600: '#054f46',
          700: '#043b34',
          800: '#032925',
          900: '#021916',
        },
        secondary: '#e6f3f2',
        accent:    '#089c8e',
        danger: {
          DEFAULT: '#dc2626',
          light:   '#fef2f2',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light:   '#fffbeb',
        },
        success: {
          DEFAULT: '#16a34a',
          light:   '#f0fdf4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

