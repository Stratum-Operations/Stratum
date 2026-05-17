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
        // Strict monochromatic theme
        background:  '#ffffff',
        foreground:  '#000000',
        border:      '#e5e7eb',
        
        // Legacy compatibility mappings to prevent compile breakages
        'b-black':   '#ffffff',
        'b-base':    '#ffffff',
        'b-raised':  '#ffffff',
        'b-border':  '#e5e7eb',
        'b-dim':     '#000000',
        'b-muted':   '#000000',
        'b-sub':     '#000000',
        'b-white':   '#000000',
        'b-lime':    '#000000',
        'b-lime-dim':'#e5e7eb',
        'b-red':     '#000000',
        'b-green':   '#000000',
        'b-amber':   '#000000',
      },
      borderRadius: {
        // Absolutely zero rounded corners
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
        // Zero drop shadows
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        none: 'none',
      },
      fontSize: {
        'kpi': ['5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '900' }],
        'kpi-sm': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '900' }],
      },
      letterSpacing: {
        military: '0.25em',
        wide2: '0.15em',
      },
    },
  },
  plugins: [],
}
