/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base':        '#070b14',
        'bg-card':        '#0d1220',
        'bg-raised':      '#111827',
        'bg-hover':       '#1a2234',
        'border-dim':     '#1e2d42',
        'border-light':   '#263548',
        violet:           '#7c3aed',
        cyan:             '#06b6d4',
        green:            '#22c55e',
        orange:           '#f97316',
        red:              '#ef4444',
        yellow:           '#eab308',
        'text-primary':   '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted':     '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
