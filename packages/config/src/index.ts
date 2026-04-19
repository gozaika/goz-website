/**
 * @file packages/config/src/index.ts
 * @description Shared brand and platform constants for all goZaika applications.
 */

export const BRAND_COLORS = {
  saffron: '#FF6B35',
  saffronLight: '#FFF0E8',
  forest: '#1A5C38',
  forestLight: '#EAF3DE',
  gold: '#D4A017',
  cream: '#FFF8F0',
} as const;

export const BRAND_FONTS = {
  display: 'Playfair Display',
  sans: 'Poppins',
} as const;

export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gozaika.vercel.app';
