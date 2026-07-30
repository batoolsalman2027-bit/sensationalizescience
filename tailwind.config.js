/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  corePlugins: {
    // Keep Tailwind's base reset OFF so it never overrides the bespoke
    // design system in app/globals.css. Utility classes still work.
    preflight: false,
  },
  theme: { extend: {} },
  plugins: [],
};
