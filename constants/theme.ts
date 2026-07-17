export const Colors = {
  // Backgrounds
  background: '#F8FAFC',      // Clean off-white
  surface: '#FFFFFF',         // Pure white for cards
  surface2: '#E8F8EE',        // Mint green accent surface
  surfaceDark: '#0F2231',     // Deep slate-blue for hero cards
  surfaceHover: '#F1F5F9',

  // Brand
  primary: '#2BB673',         // Eco Forest Green
  primaryLight: 'rgba(43, 182, 115, 0.1)',
  primaryGlow: 'rgba(43, 182, 115, 0.25)',

  // States
  active: '#2BB673',
  activeGlow: 'rgba(43, 182, 115, 0.35)',
  inactive: '#F1F5F9',        // Soft light grey

  // Accents
  success: '#2BB673',         // Forest Green
  successLight: 'rgba(43, 182, 115, 0.15)',
  error: '#FF4D4D',           // Vibrant Red
  errorLight: 'rgba(255, 77, 77, 0.12)',
  warning: '#FFB800',         // Amber Yellow

  // Text
  textPrimary: '#0F172A',     // Deep Slate Grey
  textSecondary: '#64748B',   // Cool Slate
  textMuted: '#94A3B8',       // Light Slate Muted
  textInverse: '#FFFFFF',

  // Borders
  border: '#E2E8F0',          // Soft slate border
  borderActive: '#2BB673',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.4)',
  modalBg: '#FFFFFF',
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
  lg: 18,                     // Softer, iOS-like rounded corners
  xl: 24,
  xxl: 32,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  primary: {
    shadowColor: '#2BB673',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
};
