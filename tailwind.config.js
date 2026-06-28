/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rust:   { DEFAULT: '#C15B38', dark: '#A34E2E', light: '#D4735A' },
        honey:  { DEFAULT: '#D4A94C', dark: '#B8912E', light: '#E0BC70' },
        steel:  { DEFAULT: '#5C7FA8', dark: '#4A6A8F', light: '#7395BA' },
        cream:  '#EDE3CC',
        forest: { DEFAULT: '#2B3830', dark: '#141C17', light: '#3A4E42' },
      },
    },
  },
  plugins: [],
}
