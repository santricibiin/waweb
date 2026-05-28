/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Navy / dark blue primary
        navy: {
          50: "#eef2fb",
          100: "#d6deef",
          200: "#aebcde",
          300: "#7c90c6",
          400: "#516aa8",
          500: "#2f4a8a",
          600: "#1e3a72",
          700: "#152c5b",
          800: "#0e1f44",
          900: "#08152e",
          950: "#040b1c",
        },
        // Gold/batik accent
        gold: {
          50: "#fbf6e7",
          100: "#f3e7b6",
          200: "#ead488",
          300: "#dfc05a",
          400: "#d4a017",
          500: "#b78210",
          600: "#92660b",
          700: "#6f4d08",
          800: "#4d3505",
          900: "#2c1d02",
        },
        cream: {
          50: "#fdfbf3",
          100: "#f7f1de",
          200: "#efe3bf",
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        "batik-light": "url('/batik-light.svg')",
        "batik-dark": "url('/batik-dark.svg')",
      },
      boxShadow: {
        soft: "0 4px 20px -8px rgba(8, 21, 46, 0.15)",
        "navy-glow": "0 8px 32px -8px rgba(30, 58, 114, 0.35)",
      },
    },
  },
  plugins: [],
};
