/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bt: {
          bg: '#F4F0E8',
          text: '#242424',
          brick: '#A64B36',
          'brick-dark': '#8E3F2D',
          'brick-light': '#C4624B',
          concrete: '#A8A39B',
          'concrete-dark': '#78736B',
          'concrete-light': '#E2DDD6',
          beige: '#D8C8B2',
          'beige-light': '#ECE3D7',
          charcoal: '#1A1A1A',
          card: '#FFFFFF',
          border: '#D8D2C7',
          muted: '#6E6B65',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}

