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
          bg: "#1a1a1a",
          panel: "#242424",
          sidebar: "#2c2c2c",
          border: "#3a3a3a",
          hover: "#383838",
          muted: "#888888",
          text: "#e8e6e3",
          subtext: "#b0b0b0",
        },
        move: {
          brilliant: "#1baca6",
          great: "#4a7eb8",
          best: "#96bc4b",
          excellent: "#5c9e47",
          good: "#8ead56",
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
        mono: ['"JetBrains Mono"', "monospace"],
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
