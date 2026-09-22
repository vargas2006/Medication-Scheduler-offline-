/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0d0f17",
        sidebarBg: "#121520",
        cardBg: "#161926",
        cardBorder: "#24293e",
        accentPurple: "#7c3aed",
        accentCyan: "#38bdf8",
      }
    },
  },
  plugins: [],
}
