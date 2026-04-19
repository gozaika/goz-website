/**
 * @file apps/website/lib/tokens.ts
 * @description Locked design tokens for goZaika website phase.
 */

export const colors = {
  saffron: '#FF6B35',
  saffronLight: '#FFF0E8',
  forest: '#1A5C38',
  forestLight: '#EAF3DE',
  gold: '#D4A017',
  goldLight: '#FEF9E7',
  cream: '#FFF8F0',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6B7280',
  gray200: '#E5E7EB',
  gray50: '#F9FAFB',
  white: '#FFFFFF',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FFFBEB',
} as const;

export const spacing = {
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

export const motion = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  max: 400,
  standard: [0.2, 0, 0, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
  scrollTrigger: { once: true, amount: 0.15 },
  stagger: 0.08,
} as const;
