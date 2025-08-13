/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        eggshell: {
          50: '#fefcf8',
          100: '#fdf9f0',
          200: '#fbf2e1',
          300: '#f8ead2',
          400: '#f5e1c3',
          500: '#f2d8b4',
          600: '#efcfa5',
          700: '#ecc696',
          800: '#e9bd87',
          900: '#e6b478',
        },
        'dark-bg': '#262624',
        'light-bg': '#fbf9f5',
        'dark-surface': '#323230',
        'light-surface': '#ffffff',
        'dark-border': '#3e3e3c',
        'light-border': '#e5e3df',
      },
      backgroundColor: {
        'primary-dark': '#262624',
        'primary-light': '#fbf9f5',
      },
    },
  },
  plugins: [],
}