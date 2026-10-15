/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cinemax: {
          950: '#050816',
          900: '#0b1220',
          800: '#111827',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(251, 191, 36, 0.15), 0 20px 45px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

