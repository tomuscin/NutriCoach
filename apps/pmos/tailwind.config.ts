import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
          border: '#222222',
          'border-subtle': '#1c1c1c',
        },
        text: {
          primary: '#f0f0f0',
          secondary: '#888888',
          tertiary: '#555555',
          inverse: '#0a0a0a',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: '#6366f120',
        },
        status: {
          backlog: '#555555',
          in_progress: '#f59e0b',
          blocked: '#ef4444',
          done: '#22c55e',
          archived: '#374151',
        },
        priority: {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#6b7280',
        },
        alignment: {
          high: '#22c55e',
          medium: '#f59e0b',
          low: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
}

export default config
