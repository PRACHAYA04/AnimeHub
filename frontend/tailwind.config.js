/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Prompt', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
