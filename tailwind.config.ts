import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f5",
          100: "#dcece5",
          200: "#b8d9cb",
          300: "#8ec0ab",
          400: "#5fa287",
          500: "#3d8569",
          600: "#2b6a53",
          700: "#235544",
          800: "#1e4437",
          900: "#1a382e",
        },
      },
      fontFamily: {
        sans: ["Tahoma", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
