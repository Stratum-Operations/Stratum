/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        /* ── Dark brutalist trading theme ── */
        bg:          '#070707',
        surface:     '#0e0e0e',
        'surface-2': '#141414',
        'surface-3': '#1a1a1a',
        border:      '#1c1c1c',
        'border-2':  '#2e2e2e',
        'border-3':  '#404040',
        text:        '#d0d0d0',
        'text-2':    '#888888',
        'text-3':    '#4a4a4a',
        white:       '#ffffff',
        green:       '#22c55e',
        'green-dim': '#166534',
        red:         '#ef4444',
        'red-dim':   '#7f1d1d',
        amber:       '#f59e0b',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        full: '0px',
      },
      boxShadow: {
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        none: 'none',
      },
      fontWeight: {
        700: '700',
        800: '800',
        900: '900',
      },
    },
  },
  plugins: [],
}
