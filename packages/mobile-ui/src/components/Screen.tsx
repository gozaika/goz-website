import type { ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { palette } from "../tokens/colors";
import { spacing } from "../tokens/layout";

export interface ScreenProps {
  readonly children: ReactNode;
  /** Scrollable content (default true). */
  readonly scroll?: boolean;
  /** Background color (defaults to cream). */
  readonly background?: string;
  /** Safe-area edges to apply. */
  readonly edges?: readonly Edge[];
  readonly contentStyle?: StyleProp<ViewStyle>;
  /** Stable screen identity for the capture library (e.g. `screen:drop-detail`). */
  readonly testID?: string;
}

/** Safe-area screen wrapper with consistent background and padding. */
export function Screen({
  children,
  scroll = true,
  background = palette.cream,
  edges = ["top", "bottom"],
  contentStyle,
  testID,
}: ScreenProps) {
  const padded: StyleProp<ViewStyle> = [{ padding: spacing.xl, gap: spacing.lg }, contentStyle];

  return (
    <SafeAreaView testID={testID} style={{ flex: 1, backgroundColor: background }} edges={edges as Edge[]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[{ flexGrow: 1 }, padded]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padded]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
