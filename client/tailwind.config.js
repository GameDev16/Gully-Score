/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#E8F5EF",
          100: "#C6E5D3",
          200: "#9ED2B4",
          500: "#1A7A4A",
          600: "#176A41",
          700: "#125735",
          800: "#0E4429",
        },
        cream: "#F5F0E8",
        accent: "#E89C2F",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Syne", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        flash: {
          "0%": { background: "#E89C2F33" },
          "100%": { background: "transparent" },
        },
        pulseDot: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
      },
      animation: {
        flash: "flash 1s ease-out",
        pulseDot: "pulseDot 1.4s infinite",
      },
    },
  },
  plugins: [],
};
