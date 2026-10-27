/** @type {import('tailwindcss').Config} */
// Theme: dark green + "dark white" (muted off-white/cream) only.
// No other accent colors are used in the UI.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Deep, near-black greens form the background layers.
        ink: {
          900: "#06150e", // page background (darkest green)
          800: "#0a2418", // base surface
          700: "#0f2e1f", // card surface
          600: "#143a28", // raised surface / borders
          500: "#1c4a33", // hover / outline
        },
        // The single accent family: forest/emerald green.
        green: {
          300: "#7fc8a3", // soft highlight
          400: "#54b07f", // bright accent
          500: "#2f9e6b", // primary accent
          600: "#1f7a4d", // pressed / solid
          700: "#155f3a", // deep accent
        },
        // "Dark white": warm muted off-whites used for text and faint surfaces.
        cream: {
          50: "#f4f1ea", // brightest text / near-white
          100: "#ece9e2", // primary text on dark
          200: "#ddd9cf", // secondary text
          300: "#c6c2b6", // muted text
          400: "#a8a499", // faint / disabled
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(236,233,226,0.05) inset, 0 10px 30px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(47,158,107,0.5), 0 0 24px -6px rgba(47,158,107,0.55)",
      },
      keyframes: {
        popIn: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spinBall: {
          "0%": { transform: "rotate(0deg) translateY(0)" },
          "100%": { transform: "rotate(360deg) translateY(0)" },
        },
      },
      animation: {
        popIn: "popIn 0.4s ease-out",
        fadeIn: "fadeIn 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
