/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Warm ivory -> champagne -> charcoal. Every existing page (including
        // admin) uses this scale, so it restyles the whole app at once.
        brand: {
          50: "#FBF8F3",
          100: "#F4EEE4",
          200: "#E8DDCC",
          300: "#D3C3A8",
          400: "#8E7C64",
          500: "#6F6150",
          600: "#4F463C",
          700: "#3A342D",
          800: "#2A2621",
          900: "#1C1A17",
        },
        gold: {
          100: "#F3E7CF",
          300: "#DFC596",
          500: "#C8A96E",
          700: "#9C7E45",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(28,26,23,0.04), 0 12px 32px -12px rgba(28,26,23,0.12)",
        lift: "0 2px 4px rgba(28,26,23,0.05), 0 24px 60px -20px rgba(28,26,23,0.25)",
      },
    },
  },
  plugins: [],
};
