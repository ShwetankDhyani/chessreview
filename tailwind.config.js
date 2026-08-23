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
          // Translucent hairlines for matte/glass surfaces
          hairline: "rgba(255,255,255,0.07)",
          "hairline-strong": "rgba(255,255,255,0.11)",
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
      /**
       * Elevation scale — multi-layered, low-opacity shadows.
       * Each level pairs a tight contact shadow with a wide diffused one so
       * surfaces read as lifted rather than outlined.
       */
      boxShadow: {
        "elev-1": "0 1px 2px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.10)",
        "elev-2":
          "0 1px 2px rgba(0,0,0,0.20), 0 3px 8px -2px rgba(0,0,0,0.18), 0 8px 20px -6px rgba(0,0,0,0.16)",
        "elev-3":
          "0 1px 2px rgba(0,0,0,0.22), 0 6px 14px -4px rgba(0,0,0,0.22), 0 16px 36px -10px rgba(0,0,0,0.24)",
        "elev-4":
          "0 2px 4px rgba(0,0,0,0.24), 0 10px 24px -6px rgba(0,0,0,0.28), 0 28px 60px -16px rgba(0,0,0,0.34)",
        // Upward variant for bottom-anchored bars
        "elev-up":
          "0 -1px 2px rgba(0,0,0,0.18), 0 -6px 16px -6px rgba(0,0,0,0.22), 0 -16px 34px -12px rgba(0,0,0,0.22)",
        // Inner top highlight that gives matte panels a lit edge
        rim: "inset 0 1px 0 rgba(255,255,255,0.05)",
        "rim-strong": "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      transitionTimingFunction: {
        // Gentle deceleration for surface + color changes
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
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
