/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './newtab.html',
    './newtab.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        geist: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        surface: '#0a0e14',
        panel: '#141820',
        panel2: '#1a1f2b',
        accent: '#3b82f6',
        'accent-light': '#60a5fa',
        'accent-dark': '#2563eb',
        subtle: '#94a3b8',
        success: '#10b981',
        danger: '#ef4444'
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2), inset 0 1px 0 0 rgba(255,255,255,0.05)',
        'card-hover': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3), inset 0 1px 0 0 rgba(255,255,255,0.08)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.2)'
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem'
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '12px',
        'lg': '20px'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
}



