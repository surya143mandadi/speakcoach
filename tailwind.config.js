/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0713',
        panel: '#150d24',
        panel2: '#1d1332',
        line: '#2c1f47',
        brand: '#8b5cf6',
        brand2: '#c084fc',
        mint: '#34d399',
        amber: '#fbbf24',
        rose: '#fb7185'
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        },
        rise: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        pulseRing: 'pulseRing 1.6s ease-out infinite',
        rise: 'rise .25s ease-out both'
      }
    }
  },
  plugins: []
}
