/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  // Toggle light/dark by adding/removing the `dark` class on <html>.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Semantic tokens that swap automatically per theme via CSS variables
        // in src/index.css. Use these for layout chrome so light/dark both work.
        app: "rgb(var(--color-app) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        elevated: "rgb(var(--color-elevated) / <alpha-value>)",
        subtle: "rgb(var(--color-subtle) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        "line-strong": "rgb(var(--color-line-strong) / <alpha-value>)",
        fg: "rgb(var(--color-fg) / <alpha-value>)",
        "fg-muted": "rgb(var(--color-fg-muted) / <alpha-value>)",
        "fg-subtle": "rgb(var(--color-fg-subtle) / <alpha-value>)",
        "fg-dim": "rgb(var(--color-fg-dim) / <alpha-value>)",

        // Existing brand palettes — unchanged.
        primary: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        surface: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(99, 102, 241, 0.12)",
        card:  "0 4px 24px rgba(0,0,0,0.08)",
        glow:  "0 0 20px rgba(99, 102, 241, 0.4)",
      },
      backgroundImage: {
        // Token-driven gradient; values are set per theme in index.css.
        "hero-gradient": "var(--hero-gradient)",
      },
    },
  },
  plugins: [],
};
