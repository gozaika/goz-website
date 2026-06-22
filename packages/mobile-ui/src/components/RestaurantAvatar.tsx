import { View } from "react-native";
import { firstGrapheme, stableFallbackColor } from "../fallback";
import { palette } from "../tokens/colors";
import { radii } from "../tokens/layout";
import { Text } from "./Text";

export interface RestaurantAvatarProps {
  readonly restaurantName: string;
  readonly size?: number;
}

export function RestaurantAvatar({ restaurantName, size = 48 }: RestaurantAvatarProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${restaurantName} restaurant mark`}
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radii.md,
        backgroundColor: stableFallbackColor(restaurantName),
      }}
    >
      <Text color={palette.cream} variant="heading" style={{ fontSize: Math.max(16, size * 0.42) }}>
        {firstGrapheme(restaurantName)}
      </Text>
    </View>
  );
}
