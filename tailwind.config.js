/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#f4f7f5",
          100: "#e3ece6",
          200: "#c7d8cd",
          300: "#9ebaa9",
          400: "#6f9682",
          500: "#4d7864",
          600: "#3a604f",
          700: "#2f4d40",
          800: "#283e35",
          900: "#22332c",
          950: "#111d18",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
