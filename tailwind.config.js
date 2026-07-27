/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#f0f5fa',
          100: '#dbe7f3',
          200: '#bdd2e8',
          300: '#95b8db',
          400: '#6297ca',
          500: '#3577b3',
          600: '#1b548b', // Custom #1b548b brand blue
          700: '#14426e',
          800: '#113559',
          900: '#0f2a46',
          950: '#0a1b2e',
        },
      },
    },
  },
  plugins: [],
};
