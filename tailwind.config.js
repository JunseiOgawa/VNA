/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./*.js",
    "./public/**/*.{html,js}",
    './src/**/*.{html,js,ts,jsx,tsx}',
    './popup.html',
    './options.html',
    './recorder.html',
    'node_modules/preline/preline.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    require('preline/plugin'),
  ],
}
