import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Highlight (Primary Blue)
        primary: '#006FFD',
        'primary-light': '#2897FF',
        'primary-lighter': '#6FBAFF',
        'primary-pale': '#B4DBFF',
        'primary-subtle': '#EAF2FF',

        // Neutral Light
        'neutral-100': '#C5C6CC',
        'neutral-200': '#D4D6DD',
        'neutral-300': '#E8E9F1',
        'neutral-400': '#F8F9FE',
        'neutral-white': '#FFFFFF',

        // Neutral Dark
        'neutral-900': '#1F2024',
        'neutral-800': '#2F3036',
        'neutral-700': '#494A50',
        'neutral-600': '#71727A',
        'neutral-500': '#8F9098',

        // Background
        background: '#FFFFFF',
        secondary: '#F8F9FE',

        // Foreground
        foreground: '#1F2024',
        'foreground-secondary': '#494A50',
        muted: '#E8E9F1',
        'muted-foreground': '#71727A',

        // Support Colors
        success: '#3AC0A0',
        'success-dark': '#298267',
        'success-light': '#E7F4E8',

        warning: '#E86339',
        'warning-light': '#FFB37C',
        'warning-pale': '#FFF4E4',

        error: '#ED3241',
        'error-light': '#FF616D',
        'error-pale': '#FFE2E5',

        // Legacy colors for compatibility
        ink: '#1F2024',
        shell: '#FFFFFF',
        pine: '#006FFD',
        clay: '#E86339',
        sand: '#E8E9F1',
        coral: '#ED3241',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
