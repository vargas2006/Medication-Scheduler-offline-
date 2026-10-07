/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0b0e14",
        sidebarBg: "#0f131d",
        cardBg: "#151926",
        cardBorder: "#222838",
        accentPrimary: "#7c3aed",
      }
    },
  },
  plugins: [],
}
