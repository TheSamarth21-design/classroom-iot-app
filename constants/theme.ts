export const Colors = {
  // Backgrounds
  background: '#0D0D14',
  surface: '#1A1A2E',
  surface2: '#252540',
  surfaceHover: '#2E2E50',

  // Brand
  primary: '#6C63FF',
  primaryLight: 'rgba(108, 99, 255, 0.15)',
  primaryGlow: 'rgba(108, 99, 255, 0.3)',

  // States
  active: '#6C63FF',
  activeGlow: 'rgba(108, 99, 255, 0.4)',
  inactive: '#2A2A45',

  // Accents
  success: '#4ECDC4',
  successLight: 'rgba(78, 205, 196, 0.15)',
  error: '#FF6B6B',
  errorLight: 'rgba(255, 107, 107, 0.15)',
  warning: '#FFD93D',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8888BB',
  textMuted: '#555580',
  textInverse: '#0D0D14',

  // Borders
  border: 'rgba(108, 99, 255, 0.15)',
  borderLight: 'rgba(255, 255, 255, 0.06)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  modalBg: 'rgba(13, 13, 20, 0.95)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 38,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primary: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};
