// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-tint": "#c6c6c7",
        "on-tertiary-container": "#007518",
        "surface-container-low": "#1c1b1b",
        "outline-variant": "#444748",
        "surface-container-highest": "#353534",
        "surface-container-high": "#2a2a2a",
        "background": "#131313",
        "on-background": "#e5e2e1",
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#c4c7c8",
        "primary": "#ffffff",
        "tertiary-container": "#72ff70",
        "on-tertiary-container": "#007518",
      },
      spacing: {
        "stack-gap-lg": "3rem",
        "gutter-grid": "1rem",
        "margin-main": "2rem",
      },
      fontFamily: {
        "keypad-num": ["Manrope"],
        "keypad-sub": ["Inter"],
        "body-md": ["Inter"],
        "headline-lg": ["Manrope"],
        "label-sm": ["Inter"],
      },
      fontSize: {
        "keypad-num": ["28px", { lineHeight: "34px", fontWeight: "500" }],
        "keypad-sub": ["10px", { lineHeight: "12px", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "label-sm": ["13px", { lineHeight: "18px", letterSpacing: "0.01em", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
}