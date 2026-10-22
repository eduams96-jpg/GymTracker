export const GymTheme = {
  colors: {
    background: '#0B0D11',
    card: '#161922',
    cardElevated: '#1F2430',
    cardBorder: '#272E3D',
    primary: '#10B981', // Emerald Gym Green
    primaryLight: '#34D399',
    primaryDark: '#059669',
    accent: '#F59E0B', // Amber for PRs & Timer
    danger: '#EF4444', // Red for cancel/delete
    info: '#3B82F6', // Blue
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#232936',
    inputBackground: '#12151C',
    success: '#10B981',
    surface: '#1A1E29',
    tint: '#10B981',
  },
  typography: {
    headingFont: 'System',
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
      huge: 34,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },
};

export default GymTheme;
