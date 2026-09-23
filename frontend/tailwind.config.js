/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tipografía de marca: Quicksand en toda la interfaz (manual de identidad).
      // Quicksand llega hasta 700, así que los pesos 800/900 del código se
      // resuelven a Bold; los títulos grandes compensan con tracking en index.css.
      fontFamily: {
        sans: ['Quicksand', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: '500',   // Quicksand Regular se ve muy delgada en cuerpo; Medium lee mejor
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '700',
        black: '700',
      },
      colors: {
        chamba: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        regio: {
          50: '#f8fafc',
          800: '#1e293b',
          900: '#0f172a',
          accent: '#f97316', // Naranja industrial
        }
      }
    },
  },
  plugins: [],
}
