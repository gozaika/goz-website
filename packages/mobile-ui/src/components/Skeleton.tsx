import { useEffect, useRef } from "react";
import { Animated, type DimensionValue } from "react-native";
import { useReducedMotion } from "../motion";
import { palette } from "../tokens/colors";
import { radii } from "../tokens/layout";

export interface SkeletonProps {
  readonly width?: DimensionValue;
  readonly height?: number;
  readonly radius?: number;
}

/**
 * Pulsing placeholder for loading states. Honors the OS reduced-motion setting:
 * when reduced motion is on, it holds a static mid opacity instead of looping.
 */
export function Skeleton({ width = "100%", height = 16, radius = radii.sm }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (reduceMotion) {
      // Settle on a steady, readable opacity and run no animation.
      opacity.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: radius, backgroundColor: palette.border, opacity }}
    />
  );
}
