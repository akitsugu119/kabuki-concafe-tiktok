import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // かぶき／コンカフェの夜・ネオン感ベースカラー
        ink: {
          900: "#0a0710", // 背景ベース（黒〜濃い紫グレー）
          800: "#13101c",
          700: "#1c1828",
          600: "#272235",
        },
        neon: {
          pink: "#ff5fa2",
          rose: "#ff8fc4",
          purple: "#9b6dff",
          violet: "#c8a2ff",
          blue: "#7fd6ff",
        },
      },
      fontFamily: {
        // 丸みがありつつ読みやすい
        rounded: [
          "var(--font-rounded)",
          "Hiragino Maru Gothic ProN",
          "Quicksand",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        neon: "0 0 18px rgba(255,95,162,0.35), 0 0 4px rgba(155,109,255,0.4)",
        "neon-soft": "0 8px 30px rgba(155,109,255,0.18)",
      },
      backgroundImage: {
        "accent-grad":
          "linear-gradient(135deg, #ff5fa2 0%, #9b6dff 60%, #7fd6ff 120%)",
        "accent-grad-soft":
          "linear-gradient(135deg, rgba(255,95,162,0.9), rgba(155,109,255,0.9))",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "nudge-y": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(4px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease both",
        "fade-out": "fade-out 0.6s ease 2.4s both",
        "nudge-y": "nudge-y 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
