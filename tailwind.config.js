/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'wood-light': '#DEB887',
        'wood-dark': '#8B4513',
        'vermilion': '#B22222',
        'jade': '#4A7C59',
        'ink': '#1a1a1a',
        'ivory': '#FFFFF0',
      },
    },
  },
  plugins: [],
};
