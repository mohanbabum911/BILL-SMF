/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#1d4ed8',
          700: '#1e3a8a',
          900: '#0f172a',
        },
      },
      boxShadow: {
        invoice: '0 20px 50px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  plugins: [],
};
