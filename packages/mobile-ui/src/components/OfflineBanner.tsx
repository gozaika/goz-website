import { View } from "react-native";
import { palette, toneColors } from "../tokens/colors";
import { spacing } from "../tokens/layout";
import { Text } from "./Text";

export interface OfflineBannerProps {
  /** Whether the device is currently offline. */
  readonly offline: boolean;
  /** Optional "last updated" context for stale cached content. */
  readonly lastUpdatedLabel?: string;
}

/**
 * Honest offline/stale indicator (shared spec §6). Renders nothing when online
 * and no staleness to report. Uses text + icon-free copy so meaning is not
 * color-dependent.
 */
export function OfflineBanner({ offline, lastUpdatedLabel }: OfflineBannerProps) {
  if (!offline && !lastUpdatedLabel) {
    return null;
  }
  const tone = toneColors(offline ? "warning" : "neutral");
  const message = offline
    ? `You're offline. Showing saved content${lastUpdatedLabel ? ` from ${lastUpdatedLabel}` : ""}.`
    : `Last updated ${lastUpdatedLabel}.`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: tone.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
    >
      <Text variant="label" color={offline ? tone.fg : palette.muted}>
        {message}
      </Text>
    </View>
  );
}
