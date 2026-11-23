/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Warm ivory -> champagne -> charcoal. Every existing page (including
        // admin) uses this scale, so it restyles the whole app at once.
        // Text rule (see DESIGN.md): body/caption text uses 400 or darker.
        // 400 and gold-700 were darkened so small text passes WCAG AA
        // (>= 4.5:1) on both brand-50 and brand-100 backgrounds.
        // 200/300 are for borders, dividers and decoration only.
        brand: {
          50: "#FBF8F3",
          100: "#F4EEE4",
          200: "#E8DDCC",
          300: "#D3C3A8",
          400: "#766651",
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
          700: "#7D6334",
        },
        // Accents (Phase 1 experience). Use sparingly: blush for warmth and
        // editorial moments, teal for the Beauty Studio and its actions.
        // 700 shades are the only ones used for text (>= 4.5:1 on brand-50).
        blush: {
          50: "#FBF1EE",
          100: "#F6E1DB",
          300: "#E7B9AE",
          500: "#C98476",
          700: "#8E4A3F",
        },
        teal: {
          50: "#EEF6F5",
          100: "#D9ECEA",
          300: "#8FC1BE",
          500: "#2F7F86",
          700: "#1A5E66",
          900: "#103E44",
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
