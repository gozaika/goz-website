import type { ViewStyle } from "react-native";

/** Spacing, radii, type scale and minimum touch targets. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/**
 * Minimum interactive target. 48dp Android / 44pt iOS — use 48 as the safe floor
 * (shared spec §8, restaurant spec §9 counter targets).
 */
export const MIN_TOUCH_TARGET = 48 as const;

/** Tablet breakpoint (restaurant spec §3). */
export const TABLET_MIN_WIDTH = 768 as const;

export const typography = {
  display: { fontSize: 28, fontWeight: "800", lineHeight: 36 },
  title: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  heading: { fontSize: 17, fontWeight: "700", lineHeight: 24 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
} as const;

export type ElevationLevel = "none" | "sm" | "md" | "lg";

export const elevation = {
  none: {
    elevation: 0,
    shadowOpacity: 0,
  },
  sm: {
    shadowColor: "#2D2D2D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#2D2D2D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  lg: {
    shadowColor: "#2D2D2D",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 9,
  },
} satisfies Record<ElevationLevel, ViewStyle>;
