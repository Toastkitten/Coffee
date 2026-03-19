/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        espresso: {
          50: '#fdf8f3',
          100: '#f9ede0',
          200: '#f2d9bf',
          300: '#e8be93',
          400: '#dc9d66',
          500: '#d48244',
          600: '#c66a39',
          700: '#a55231',
          800: '#84432e',
          900: '#6b3828',
        },
        pour: {
          50: '#f6f7f4',
          100: '#e8ebe4',
          200: '#d4dac9',
          300: '#b5c0a5',
          400: '#96a67f',
          500: '#788b63',
          600: '#5e6f4d',
          700: '#4b583e',
          800: '#3e4834',
          900: '#353d2d',
        },
      },
    },
  },
  plugins: [],
}
