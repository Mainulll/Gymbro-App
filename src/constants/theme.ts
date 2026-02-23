export const Colors = {
  // Backgrounds
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C27',
  surfaceGlass: 'rgba(255,255,255,0.06)',
  border: '#2A2A3D',
  borderLight: '#35354A',
  borderGlass: 'rgba(255,255,255,0.12)',

  // Brand
  accent: '#7C6FFF',
  accentMuted: 'rgba(124, 111, 255, 0.18)',
  accentLight: '#9D94FF',
  accentDark: '#5A4FD6',

  // Vibrant palette
  teal: '#00D9C0',
  tealMuted: 'rgba(0, 217, 192, 0.15)',
  coral: '#FF6B6B',
  coralMuted: 'rgba(255, 107, 107, 0.15)',
  amber: '#FFB347',
  amberMuted: 'rgba(255, 179, 71, 0.15)',
  pink: '#FF6B9D',
  pinkMuted: 'rgba(255, 107, 157, 0.15)',
  mint: '#4ECB71',
  mintMuted: 'rgba(78, 203, 113, 0.15)',

  // Semantic
  success: '#4ECB71',
  successMuted: 'rgba(78, 203, 113, 0.15)',
  warning: '#FFB347',
  warningMuted: 'rgba(255, 179, 71, 0.15)',
  danger: '#FF6B6B',
  dangerMuted: 'rgba(255, 107, 107, 0.15)',

  // Macros
  protein: '#7C6FFF',
  carbs: '#FFB347',
  fat: '#FF6B9D',

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#8888AA',
  textMuted: '#44445A',
  textInverse: '#000000',

  // Tab bar
  tabBar: 'rgba(10,10,18,0.85)',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  tabActive: '#9D94FF',
  tabInactive: '#44445A',
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
  xxl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  accent: {
    shadowColor: '#7C6FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  teal: {
    shadowColor: '#00D9C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// Tab bar constants for bottom padding
export const TAB_BAR_HEIGHT = 84; // iOS
export const TAB_BAR_HEIGHT_ANDROID = 64;
export const SCROLL_BOTTOM_PADDING = 100; // safe buffer
