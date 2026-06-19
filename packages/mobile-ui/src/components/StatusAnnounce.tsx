import { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import { palette } from "../tokens/colors";
import { Text } from "./Text";

export interface StatusAnnounceProps {
  /** Message to announce to screen readers (countdown/payment/pickup result). */
  readonly message: string;
  /** Also render the text visually. Default false (announce-only). */
  readonly visible?: boolean;
  readonly color?: string;
}

/**
 * Screen-reader announcement for time-sensitive results (shared spec §8:
 * announce countdown/payment/pickup outcomes). Announces on message change and
 * exposes a polite live region for assistive tech.
 */
export function StatusAnnounce({ message, visible = false, color = palette.charcoal }: StatusAnnounceProps) {
  useEffect(() => {
    if (message) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);

  if (!visible) {
    return <View accessibilityLiveRegion="polite" style={{ width: 0, height: 0, overflow: "hidden" }} />;
  }

  return (
    <View accessibilityLiveRegion="polite">
      <Text variant="label" color={color}>
        {message}
      </Text>
    </View>
  );
}
