/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Team A - Tech/Space
        'team-a-primary': '#6366f1',   // Indigo
        'team-a-secondary': '#8b5cf6',  // Purple
        'team-a-bg': '#0f172a',        // Dark
        // Team B - Minimal/Clean
        'team-b-primary': '#2563eb',    // Blue
        'team-b-secondary': '#3b82f6',   // Light Blue
        'team-b-bg': '#f8fafc',        // Light
      }
    }
  },
  plugins: []
}
