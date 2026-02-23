export const Colors = {
  // Backgrounds
  background: '#0D0D0D',
  surface: '#161616',
  surfaceElevated: '#1E1E1E',
  surfaceGlass: 'rgba(255,255,255,0.05)',
  border: '#2A2A2A',
  borderLight: '#333333',
  borderGlass: 'rgba(255,255,255,0.10)',

  // Brand
  accent: '#6C63FF',
  accentMuted: 'rgba(108, 99, 255, 0.15)',
  accentLight: '#8B85FF',
  accentDark: '#5A52E0',

  // Semantic
  success: '#4CAF50',
  successMuted: 'rgba(76, 175, 80, 0.15)',
  warning: '#FF9800',
  warningMuted: 'rgba(255, 152, 0, 0.15)',
  danger: '#FF5252',
  dangerMuted: 'rgba(255, 82, 82, 0.15)',

  // Macros
  protein: '#6C63FF',
  carbs: '#FFB347',
  fat: '#FF6B9D',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#444444',
  textInverse: '#000000',

  // Tab bar
  tabBar: '#111111',
  tabBarBorder: '#1E1E1E',
  tabActive: '#6C63FF',
  tabInactive: '#555555',
} as const;

export const Typography = {
  fontFamily: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    xxxl: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  accent: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
