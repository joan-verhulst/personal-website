// tailwind.config.ts
import { type Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neutral: {
          50: "#FAF9F9",
          100: "#F3F3F3",
          200: "#D8D8D8",
          300: "#BDBDBD",
          400: "#A2A2A2",
          500: "#878787",
          600: "#6D6D6D",
          700: "#525252",
          800: "#373737",
          900: "#1C1C1C",
          950: "#0F0F0F",
          DEFAULT: "#0F0F0F",
        },
        primary: {
          50: "#ECF5FB",
          100: "#D8EBF7",
          200: "#B1D7F0",
          300: "#89C3E8",
          400: "#62AFE0",
          500: "#3A9BD8",
          600: "#247FB8",
          700: "#1B608A",
          800: "#12405D",
          900: "#0A2130",
          950: "#05121A",
          DEFAULT: "#3A9BD8",
        },
      },
      fontSize: {
        sm: "0.75rem",
        base: "1rem",
        lg: "1.125rem",
      },
    },
  },
};
export default config;
