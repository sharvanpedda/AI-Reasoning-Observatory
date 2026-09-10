import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Instrument panel" palette
        graphite: {
          950: "#0d0f10",
          900: "#14171a",
          800: "#1c2023",
          700: "#282d31",
          600: "#3a4147",
          500: "#4e5761",
        },
        amber: {
          300: "#fcd283",
          400: "#ffb454",
          500: "#f59e3c",
          600: "#d97f24",
        },
        cyan: {
          200: "#b8f4f0",
          300: "#7fe8e0",
          400: "#4fd1c9",
          500: "#2bb3ab",
        },
        violet: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
        },
        emerald: {
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        sky: {
          300: "#93d5f9",
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        red: {
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
        },
        paper: "#e9e6de",
      },
      fontFamily: {
        display: ["var(--font-display)", "Playfair Display", "ui-serif", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "sans-serif"],
      },
      backgroundOpacity: {
        3: "0.03",
        8: "0.08",
      },
    },
  },
  plugins: [],
};
export default config;
