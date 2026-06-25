import { describe, expect, it } from "vitest";
import { getPressFeedbackStyle, motion } from "./motion";

describe("mobile motion tokens", () => {
  it("keeps button press feedback subtle and tactile", () => {
    expect(motion.press.scale).toBeLessThan(1);
    expect(motion.press.scale).toBeGreaterThanOrEqual(0.96);
    expect(motion.press.opacity).toBeGreaterThan(0.75);
  });

  it("removes transform feedback when reduced motion is requested", () => {
    expect(getPressFeedbackStyle(false)).toMatchObject({
      opacity: motion.press.opacity,
      transform: [{ scale: motion.press.scale }],
    });
    expect(getPressFeedbackStyle(true)).toEqual({ opacity: motion.press.reducedMotionOpacity });
  });
});
