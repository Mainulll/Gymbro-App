/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        background: '#0A0A0F',
        surface: '#13131A',
        'surface-elevated': '#1C1C27',
        border: '#2A2A3D',
        'border-light': '#35354A',
        // Brand  — accent/18 = accentMuted, teal/15 = tealMuted, etc.
        accent: '#7C6FFF',
        'accent-light': '#9D94FF',
        'accent-dark': '#5A4FD6',
        // Vibrant palette
        teal: '#00D9C0',
        coral: '#FF6B6B',
        amber: '#FFB347',
        pink: '#FF6B9D',
        mint: '#4ECB71',
        // Semantic
        success: '#4ECB71',
        warning: '#FFB347',
        danger: '#FF6B6B',
        // Macros
        protein: '#7C6FFF',
        carbs: '#FFB347',
        fat: '#FF6B9D',
        // Text
        'text-primary': '#F0F0FF',
        'text-secondary': '#8888AA',
        'text-muted': '#44445A',
        // Tab bar
        'tab-active': '#9D94FF',
        'tab-inactive': '#44445A',
      },
    },
  },
  plugins: [],
};
