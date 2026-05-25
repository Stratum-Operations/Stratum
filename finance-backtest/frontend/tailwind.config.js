/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* ── Theme-aware dynamic colors mapping to App.css variables ── */
        bg:           'var(--bg)',
        surface:      'var(--surface)',
        'surface-2':  'var(--surface-2)',
        'surface-3':  'var(--surface-3)',
        border:       'var(--border)',
        'border-2':   'var(--border-2)',
        'border-3':   'var(--border-3)',
        text:         'var(--text)',
        'text-strong':'var(--text-strong)',
        'text-2':     'var(--text-2)',
        'text-3':     'var(--text-3)',
        white:        'var(--white)',
        green:        'var(--green)',
        'green-dim':  'var(--green-dim)',
        red:          'var(--red)',
        'red-dim':    'var(--red-dim)',
        amber:        'var(--amber)',
        'amber-dim':  'var(--amber-dim)',
        blue:         'var(--blue)',
        'blue-dim':   'var(--blue-dim)',
        teal:         'var(--teal)',
        accent:       'var(--accent)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius, 0.625rem)',
        none: '0px',
        sm: 'calc(var(--radius, 0.625rem) - 4px)',
        md: 'calc(var(--radius, 0.625rem) - 2px)',
        lg: 'var(--radius, 0.625rem)',
        xl: 'calc(var(--radius, 0.625rem) + 2px)',
        '2xl': 'calc(var(--radius, 0.625rem) + 4px)',
        full: '9999px',
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
