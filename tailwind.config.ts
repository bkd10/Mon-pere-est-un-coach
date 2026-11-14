import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: { 50: "#eefbf3", 100: "#d6f5e1", 200: "#aeeac6", 300: "#78d9a4", 400: "#40c07e", 500: "#1ca463", 600: "#0f844f", 700: "#0d6941", 800: "#0d5336", 900: "#0b442e" },
        sun: { 100: "#fff3d1", 300: "#ffd772", 400: "#ffc640", 500: "#f9a826", 600: "#dd8410" },
        ink: { 900: "#10231b", 700: "#2c4238", 500: "#51655c", 300: "#a9b8b1", 100: "#e8eeeb", 50: "#f5f8f6" },
        coral: { 100: "#ffe3dc", 500: "#f2674b", 600: "#b33a24" },
        sky: { 100: "#e0f0ff", 500: "#3b8fe0", 600: "#2372c2" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], display: ["var(--font-display)", "system-ui", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(16,35,27,.06), 0 6px 20px -8px rgba(16,35,27,.14)" },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
