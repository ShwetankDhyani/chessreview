/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        board: {
          dark: "#769656",
          light: "#eeeed2",
        },
        chess: {
          // Chess.com-inspired warm dark palette
          bg: "#262421",
          panel: "#312e2b",
          sidebar: "#262421",
          surface: "#3a3633",
          border: "#3f3c39",
          "border-strong": "#4a4744",
          hover: "#3a3633",
          muted: "#8b8784",
          text: "#f1f1f1",
          subtext: "#bdbab9",
          accent: "#81b64c",
          "accent-hover": "#94c455",
        },
        move: {
          brilliant: "#1baca6",
          great: "#5b8fbf",
          best: "#81b64c",
          excellent: "#76a948",
          good: "#a8c468",
          book: "#b58863",
          inaccuracy: "#f0c050",
          mistake: "#e69045",
          blunder: "#e84855",
          miss: "#9b59b6",
        },
        eval: {
          white: "#f0f0f0",
          black: "#1a1a1a",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      animation: {
        "eval-slide": "evalSlide 0.4s ease-in-out",
        "fade-in": "fadeIn 0.2s ease-in-out",
      },
      keyframes: {
        evalSlide: {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
