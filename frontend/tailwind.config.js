/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.05), 0 8px 30px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};

