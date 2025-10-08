/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './newtab.html',
    './newtab.js'
  ],
  theme: {
    extend: {
      fontFamily: { geist: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        surface: '#0f1115',
        panel: '#171a21',
        panel2: '#1e232b',
        accent: '#ffd65a',
        subtle: '#9aa4b2'
      },
      boxShadow: {
        card: '0 2px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.08) inset, 0 8px 24px rgba(0,0,0,0.4)'
      },
      borderRadius: {
        lgx: '14px'
      }
    }
  },
  plugins: []
}



