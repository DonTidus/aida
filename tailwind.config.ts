import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0e17',
        panel: '#111827',
        edge: '#1f2a3f',
        neon: '#4ade80',
        gold: '#fbbf24',
        ember: '#fb7185',
        sky2: '#38bdf8',
      },
      fontFamily: { mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'] },
    },
  },
  plugins: [],
};
export default config;
