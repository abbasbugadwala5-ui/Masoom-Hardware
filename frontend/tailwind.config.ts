import type { Config } from 'tailwindcss';

/**
 * Industrial palette — Stanley / DeWalt / Caterpillar.
 * brand-* = industrial yellow.   ink-* = matte black / steel.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fffce6',
          100: '#fff8b3',
          200: '#fff080',
          300: '#ffe84d',
          400: '#ffdc1a',
          500: '#ffcc00',
          600: '#e6b800',
          700: '#b38f00',
          800: '#806600',
          900: '#4d3d00',
          950: '#1f1900',
        },
        ink: {
          50:  '#f7f7f8',
          100: '#ececef',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#6b6b75',
          500: '#4a4a52',
          600: '#33333a',
          700: '#22222a',
          800: '#15151b',
          900: '#0d0d11',
          950: '#050507',
        },
      },
      fontFamily: {
        sans:    ['var(--font-sans)',    'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['var(--font-mono)',    'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontWeight: {
        // Used by the display class — strong but not brutalist
        display: '800',
      },
      letterSpacing: {
        widest: '.14em',     // toned down from .18em for better legibility
      },
      boxShadow: {
        soft:   '0 1px 2px rgba(0,0,0,.05), 0 8px 24px -8px rgba(0,0,0,.18)',
        yellow: '0 10px 30px -10px rgba(255,204,0,.55)',
        glow:   '0 0 0 1px rgba(255,204,0,.35), 0 20px 60px -20px rgba(255,204,0,.55)',
      },
      backgroundImage: {
        'diagonal-stripes':
          'repeating-linear-gradient(45deg, #ffcc00 0 12px, #0d0d11 12px 24px)',
        'hero-grid':
          'linear-gradient(to bottom, rgba(5,5,7,.92), rgba(5,5,7,.96)), radial-gradient(circle at 18% 28%, rgba(255,204,0,.22), transparent 50%), radial-gradient(circle at 82% 72%, rgba(255,204,0,.10), transparent 60%)',
      },
      keyframes: {
        'pulse-yellow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,204,0,.6)' },
          '50%':      { boxShadow: '0 0 0 14px rgba(255,204,0,0)' },
        },
      },
      animation: {
        'pulse-yellow': 'pulse-yellow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
