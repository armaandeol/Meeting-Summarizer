import { theme } from './src/config/theme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...theme.colors,
      },
      backgroundColor: {
        'surface-default': theme.colors?.surface?.default || '#ffffff',
        'surface-primary': theme.colors?.surface?.primary || '#f3f4f6',
        'surface-secondary': theme.colors?.surface?.secondary || '#e5e7eb',
        'surface-tertiary': theme.colors?.surface?.tertiary || '#d1d5db',
      },
      spacing: theme.spacing,
      borderRadius: theme.borderRadius,
      boxShadow: theme.shadows,
    },
  },
  plugins: [],
}