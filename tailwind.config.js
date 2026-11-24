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
        // Warm blush-peach page surfaces (visual redesign, Screenshot B). Backgrounds
        // and borders only; text stays on the brand scale for contrast.
        peach: {
          50: "#FDF6F1",
          100: "#FAECE3",
          200: "#F4DCCD",
          300: "#EBC4AE",
        },
        // Smart Cosmetic AI rose palette (design pack DESIGN_SYSTEM.md "Color tokens").
        // Saturated shades (600-800) are for primary actions and highlights only;
        // 700+ are the shades used for text (>= 4.5:1 on rose-50 and white).
        rose: {
          50: "#FFF5F9",
          100: "#FDE8F2",
          200: "#FBD0E5",
          300: "#F8A8D0",
          line: "#F4C7DD",
          500: "#F52D8C",
          600: "#EC1479",
          700: "#D90A68",
          800: "#BD0757",
          950: "#8E003E",
        },
        ink: "#21131A",
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
        tile: "0 1px 2px rgba(120,72,48,0.06), 0 8px 20px -12px rgba(120,72,48,0.22)",
        rose: "0 10px 28px rgba(184,25,96,0.10)",
        cta: "0 12px 26px -10px rgba(189,7,87,0.55)",
      },
    },
  },
  plugins: [],
};
