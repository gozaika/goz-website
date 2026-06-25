import { useEffect, useState } from "react";
import type { EmitterSubscription, ViewStyle } from "react-native";

export const motion = {
  durationMs: {
    quick: 120,
    standard: 220,
    gentle: 250,
  },
  press: {
    scale: 0.98,
    opacity: 0.88,
    reducedMotionOpacity: 0.82,
  },
} as const;

export function getPressFeedbackStyle(reduceMotion = false): ViewStyle {
  if (reduceMotion) {
    return { opacity: motion.press.reducedMotionOpacity };
  }

  return {
    opacity: motion.press.opacity,
    transform: [{ scale: motion.press.scale }],
  };
}

export function useReducedMotion(defaultValue = false): boolean {
  const [reduceMotion, setReduceMotion] = useState(defaultValue);

  useEffect(() => {
    let mounted = true;
    let subscription: EmitterSubscription | undefined;

    import("react-native")
      .then(({ AccessibilityInfo }) => {
        if (!mounted) {
          return;
        }

        AccessibilityInfo.isReduceMotionEnabled()
          .then((enabled) => {
            if (mounted) {
              setReduceMotion(enabled);
            }
          })
          .catch(() => {
            if (mounted) {
              setReduceMotion(defaultValue);
            }
          });

        subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
      })
      .catch(() => {
        if (mounted) {
          setReduceMotion(defaultValue);
        }
      });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [defaultValue]);

  return reduceMotion;
}
