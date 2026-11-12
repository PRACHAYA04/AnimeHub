/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['IBM Plex Sans Thai', 'system-ui', 'sans-serif'], serif: ['Fraunces', 'Noto Serif Thai', 'Georgia', 'serif'] },
    },
  },
  plugins: [],
};
