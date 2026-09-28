/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7f4",
          100: "#e3ece2",
          200: "#c3d8c1",
          300: "#a2c39e",
          400: "#7fa87b",
          500: "#5c8a57",
          600: "#456b42",
          700: "#365436",
          900: "#1e2f1e",
        },
      },
    },
  },
  plugins: [],
};
