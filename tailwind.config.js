/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rust:   { DEFAULT: '#d36a4a', dark: '#b55a3c', light: '#e08468' },
        honey:  { DEFAULT: '#f0c171', dark: '#d4a84e', light: '#f5d390' },
        steel:  { DEFAULT: '#4f7bb2', dark: '#3d6499', light: '#6e95c8' },
        cream:  '#f0ede6',
        forest: { DEFAULT: '#3b413c', dark: '#1e2320', light: '#4d5550' },
        white:  '#ffffff',
      },
    },
  },
  plugins: [],
}
