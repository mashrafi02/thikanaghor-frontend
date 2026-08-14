import plugin from 'tailwindcss/plugin.js';

/**
 * Tailwind v3.
 *
 * Colours map onto the CSS variables in src/styles/tokens.css rather than holding
 * literal values. That indirection is the whole theming mechanism: `bg-surface`
 * compiles exactly once, and only the variable's value changes between light and dark.
 *
 * The `<alpha-value>` placeholder is why the tokens store space-separated RGB
 * channels — it is what makes `bg-accent/10` work.
 */

/**
 * Component dimensions — every value a 4px multiple, but outside the padding rhythm.
 * See the note beside `spacing` in the theme below for why these are separate.
 */
const DIMENSIONS = {
  9: '36px', //  input padding behind a leading icon
  11: '44px', //  minimum touch target
  14: '56px', //  topbar / bottom tab bar height
  32: '128px',
  40: '160px',
  56: '224px',
  64: '256px',
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Replaced rather than extended: an unrestricted palette is how a design system
    // erodes. If `bg-blue-500` is available, it eventually gets used, and then a
    // colour exists on screen that no token controls and dark mode never themes.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#ffffff',
      black: '#000000',

      canvas: 'rgb(var(--canvas) / <alpha-value>)',
      surface: {
        DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--surface-raised) / <alpha-value>)',
        sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
        overlay: 'rgb(var(--surface-overlay) / <alpha-value>)',
      },
      border: {
        DEFAULT: 'rgb(var(--border) / <alpha-value>)',
        strong: 'rgb(var(--border-strong) / <alpha-value>)',
      },
      ink: {
        DEFAULT: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
      },
      accent: {
        DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
        hover: 'rgb(var(--accent-hover) / <alpha-value>)',
        subtle: 'rgb(var(--accent-subtle) / <alpha-value>)',
        fg: 'rgb(var(--accent-fg) / <alpha-value>)',
      },

      // Semantic — each of these means exactly one thing. See DESIGN.md §4.3.
      won: {
        DEFAULT: 'rgb(var(--won) / <alpha-value>)',
        subtle: 'rgb(var(--won-subtle) / <alpha-value>)',
        fg: 'rgb(var(--won-fg) / <alpha-value>)',
        ink: 'rgb(var(--won-ink) / <alpha-value>)',
      },
      active: {
        DEFAULT: 'rgb(var(--active) / <alpha-value>)',
        subtle: 'rgb(var(--active-subtle) / <alpha-value>)',
        fg: 'rgb(var(--active-fg) / <alpha-value>)',
        ink: 'rgb(var(--active-ink) / <alpha-value>)',
      },
      pending: {
        DEFAULT: 'rgb(var(--pending) / <alpha-value>)',
        subtle: 'rgb(var(--pending-subtle) / <alpha-value>)',
        fg: 'rgb(var(--pending-fg) / <alpha-value>)',
        ink: 'rgb(var(--pending-ink) / <alpha-value>)',
      },
      lost: {
        DEFAULT: 'rgb(var(--lost) / <alpha-value>)',
        subtle: 'rgb(var(--lost-subtle) / <alpha-value>)',
        fg: 'rgb(var(--lost-fg) / <alpha-value>)',
        ink: 'rgb(var(--lost-ink) / <alpha-value>)',
      },
      hold: {
        DEFAULT: 'rgb(var(--hold) / <alpha-value>)',
        subtle: 'rgb(var(--hold-subtle) / <alpha-value>)',
        fg: 'rgb(var(--hold-fg) / <alpha-value>)',
        ink: 'rgb(var(--hold-ink) / <alpha-value>)',
      },

      chart: {
        1: 'rgb(var(--chart-1) / <alpha-value>)',
        2: 'rgb(var(--chart-2) / <alpha-value>)',
        3: 'rgb(var(--chart-3) / <alpha-value>)',
        4: 'rgb(var(--chart-4) / <alpha-value>)',
        5: 'rgb(var(--chart-5) / <alpha-value>)',
        grid: 'rgb(var(--chart-grid) / <alpha-value>)',
        axis: 'rgb(var(--chart-axis) / <alpha-value>)',
      },
    },

    // Also replaced — the scale is 4px-based and closed (DESIGN.md §6.1). Tailwind's
    // default includes 0.5/1.5/2.5 steps that land off-grid.
    //
    // This governs *rhythm* — padding, margin, gap. It deliberately stops at 96px,
    // because nothing inside a component should be padded further than that.
    //
    // It does NOT govern component *dimensions*. Tailwind derives width/height/inset
    // from `spacing` by default, which conflates the two: a 56px header bar and a 44px
    // touch target are on the 4px grid but have no business being padding steps. Those
    // live in `extend.height`/`width`/`size` below — see the note there for why this
    // distinction is load-bearing rather than cosmetic.
    spacing: {
      0: '0px',
      px: '1px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
    },

    borderRadius: {
      none: '0',
      sm: '6px', // inputs, chips
      md: '10px', // cards, buttons
      lg: '14px', // modals, sheets
      full: '9999px',
    },

    extend: {
      /**
       * Component dimensions — every value still a 4px multiple, just outside the padding
       * rhythm's range.
       *
       * These exist because replacing `spacing` silently narrowed width/height/inset too,
       * and Tailwind emits *nothing* for an unknown step rather than warning. That left 21
       * dead classes across the app, all failing invisibly: `min-h-14` was not enforcing
       * the 44px touch minimum its own comment promised, `h-14` was not setting the topbar
       * or sidebar height, `bottom-14` was not lifting the mobile action bar above the tab
       * bar, and every `h-32`/`h-40` loading skeleton had a computed height of zero.
       *
       * Extending the dimension scales rather than widening `spacing` keeps `p-56` from
       * becoming legal while making `h-56` work.
       */
      height: DIMENSIONS,
      minHeight: DIMENSIONS,
      maxHeight: DIMENSIONS,
      width: DIMENSIONS,
      minWidth: DIMENSIONS,
      size: DIMENSIONS,
      inset: DIMENSIONS,

      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        bangla: ['Hind Siliguri', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
      },

      // DESIGN.md §5.2. Bangla renders +1px / +2 line-height via a :lang(bn) rule in
      // index.css rather than a separate scale, so component code stays script-agnostic.
      fontSize: {
        caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'body-sm': ['13px', { lineHeight: '20px' }],
        body: ['15px', { lineHeight: '24px' }],
        h3: ['17px', { lineHeight: '24px', fontWeight: '600' }],
        h2: ['21px', { lineHeight: '28px', fontWeight: '600' }],
        h1: ['28px', { lineHeight: '34px', fontWeight: '600' }],
        display: ['40px', { lineHeight: '44px', fontWeight: '600' }],
      },

      // Only 400/500/600 exist. No 700 — semibold already reads as emphatic at these
      // sizes, and a fourth weight is another font file for the PWA to cache.
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        none: 'none',
      },

      transitionTimingFunction: {
        // The one easing curve the app uses, per DESIGN.md §10.
        standard: 'cubic-bezier(.2,0,0,1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },

      maxWidth: {
        page: '1440px',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'sheet-in-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'sheet-in-side': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(.2,0,0,1)',
        shimmer: 'shimmer 1.6s infinite',
        'sheet-in-bottom': 'sheet-in-bottom 320ms cubic-bezier(.2,0,0,1)',
        'sheet-in-side': 'sheet-in-side 320ms cubic-bezier(.2,0,0,1)',
      },
    },
  },
  plugins: [
    /**
     * `coarse:` — a touch pointer, not a narrow screen.
     *
     * The 44px hit-target minimum (DESIGN.md §12) is about fingers, not viewport width.
     * Keying it to a breakpoint would inflate controls in a narrow desktop window and,
     * worse, leave a touchscreen laptop at 32px. `(pointer: coarse)` asks the question
     * that actually matters. Tailwind v3 has no built-in pointer variant, hence this.
     */
    plugin(({ addVariant }) => {
      addVariant('coarse', '@media (pointer: coarse)');
    }),
  ],
};
