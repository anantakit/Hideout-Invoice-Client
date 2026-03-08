/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          muted: {
            DEFAULT: 'hsl(var(--success-muted))',
            foreground: 'hsl(var(--success-muted-foreground))',
          },
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          muted: {
            DEFAULT: 'hsl(var(--warning-muted))',
            foreground: 'hsl(var(--warning-muted-foreground))',
          },
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          muted: {
            DEFAULT: 'hsl(var(--info-muted))',
            foreground: 'hsl(var(--info-muted-foreground))',
          },
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          soft: 'hsl(var(--border-soft))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Booking status colors
        'bk-reserved':    { DEFAULT: 'hsl(var(--bk-reserved))',    foreground: 'hsl(var(--bk-reserved-fg))' },
        'bk-checked-in':  { DEFAULT: 'hsl(var(--bk-checked-in))',  foreground: 'hsl(var(--bk-checked-in-fg))' },
        'bk-checked-out': { DEFAULT: 'hsl(var(--bk-checked-out))', foreground: 'hsl(var(--bk-checked-out-fg))' },
        'bk-no-show':     { DEFAULT: 'hsl(var(--bk-no-show))',     foreground: 'hsl(var(--bk-no-show-fg))' },
        'bk-cancelled':   { DEFAULT: 'hsl(var(--bk-cancelled))',   foreground: 'hsl(var(--bk-cancelled-fg))' },
        // Room status indicator colors
        'room-clean': 'hsl(var(--room-clean))',
        'room-dirty': 'hsl(var(--room-dirty))',
        'room-ooo':   'hsl(var(--room-ooo))',
        // Timeline-specific
        'timeline-bg':   'hsl(var(--timeline-bg))',
        'timeline-grid': 'hsl(var(--timeline-grid))',
        'timeline-today': 'hsl(var(--timeline-today))',
      },
      width: {
        'timeline-cell': 'var(--timeline-cell-width)',
        'timeline-room-col': 'var(--timeline-room-col-width)',
      },
      minWidth: {
        'timeline-room-col': 'var(--timeline-room-col-width)',
        'timeline-7': 'calc(7 * var(--timeline-cell-width))',
      },
      maxWidth: {
        'timeline-room-col': 'var(--timeline-room-col-width)',
      },
      height: {
        'timeline-row': 'var(--timeline-row-height)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
