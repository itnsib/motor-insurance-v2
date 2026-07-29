/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NSIB brand palette
        nsib: {
          red: '#C0122B',
          'red-dark': '#8A0E20',
          'red-soft': '#FBECEE',
          gold: '#D9A441',
          'gold-dark': '#B8862A',
          'gold-soft': '#FBF1DC',
          cream: '#FAF6ED', // content background
          'cream-light': '#FEFCF7',
          sand: '#F0E4CC',
          ink: '#2B2118',
          muted: '#7A6A55',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(43, 33, 24, 0.04), 0 8px 24px -12px rgba(43, 33, 24, 0.18)',
        'card-hover': '0 2px 4px rgba(43, 33, 24, 0.06), 0 16px 32px -14px rgba(43, 33, 24, 0.25)',
      },
    },
  },
  plugins: [],
}
