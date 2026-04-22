export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#00D9FF',
        secondary: '#6366F1',
        accent: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        space: { 900: '#0A0F1C', 800: '#111827', 700: '#1F2937', 600: '#374151', 500: '#4B5563' }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: [],
}