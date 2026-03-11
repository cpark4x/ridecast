import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#EA580C",
          light: "#F97316",
          dim: "rgba(234,88,12,0.2)",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F5F5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
