import { useEffect, useRef } from "react";
import { Animated, type DimensionValue } from "react-native";
import { palette } from "../tokens/colors";
import { radii } from "../tokens/layout";

export interface SkeletonProps {
  readonly width?: DimensionValue;
  readonly height?: number;
  readonly radius?: number;
}

/** Pulsing placeholder for loading states. Honors reduced-motion via low contrast. */
export function Skeleton({ width = "100%", height = 16, radius = radii.sm }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height, borderRadius: radius, backgroundColor: palette.border, opacity }}
    />
  );
}
