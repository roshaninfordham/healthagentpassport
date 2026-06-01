import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#05060a",
        cockpit: "#0a0f1c",
        glass: "rgba(255,255,255,0.06)",
        line: "rgba(255,255,255,0.12)"
      },
      boxShadow: {
        glow: "0 0 40px rgba(20, 184, 166, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
