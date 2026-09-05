/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medsync: {
          teal: '#18A6A1',
          'teal-hover': '#148F8B',
          'teal-light': '#EAFafa',
          'teal-subtle': '#F2FBFA',
          'teal-border': '#BCECE8',
          navy: '#17385E',
          'navy-dark': '#0F2642',
          'navy-light': '#234E7C',
          'navy-muted': '#536E8F',
          bg: '#F8FBFC',
          surface: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(23, 56, 94, 0.05)',
        'soft': '0 10px 30px -10px rgba(23, 56, 94, 0.08)',
        'soft-lg': '0 20px 40px -15px rgba(23, 56, 94, 0.12)',
        'teal-glow': '0 10px 25px -5px rgba(24, 166, 161, 0.3)',
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 7s ease-in-out 2s infinite',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform': 'wave 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
        wave: {
          '0%': { height: '8px' },
          '100%': { height: '24px' },
        }
      }
    },
  },
  plugins: [],
}
