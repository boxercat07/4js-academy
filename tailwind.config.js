/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{html,js}",
    "./server/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        primaryHover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
        bgDark: 'rgb(var(--color-bg-dark) / <alpha-value>)',
        'background-dark': 'rgb(var(--color-bg-dark) / <alpha-value>)',
        glassBg: 'var(--color-glass-bg)',
        glassBorder: 'var(--color-glass-border)',
        glassBorderHover: 'var(--color-glass-border-hover)'
      },
      fontFamily: {
        display: ['Michroma', 'sans-serif'],
        sans: ['Noto Sans', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      }
    }
  },
  plugins: [],
}
