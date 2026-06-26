import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { getPressFeedbackStyle, useReducedMotion } from "../motion";
import { accents, palette, toneColors, type StatusTone } from "../tokens/colors";
import { accentTextColor } from "../tokens/contrast";
import { elevation, MIN_TOUCH_TARGET, radii, spacing } from "../tokens/layout";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { formatCountdownParts, progressPercent } from "./customerPrimitivesModel";
import { Text } from "./Text";

export interface HeroBannerStat {
  readonly label: string;
  readonly value: string;
}

export interface HeroBannerProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly stats?: readonly HeroBannerStat[];
  readonly accent?: string;
  readonly children?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export function HeroBanner({
  eyebrow,
  title,
  subtitle,
  stats = [],
  accent = accents.customer,
  children,
  style,
}: HeroBannerProps) {
  return (
    <View
      style={[
        {
          gap: spacing.md,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.cream,
          padding: spacing.xl,
          overflow: "hidden",
        },
        elevation.md,
        style,
      ]}
    >
      {eyebrow ? (
        <Text variant="caption" color={accentTextColor(accent)} style={{ textTransform: "uppercase" }}>
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text color={palette.muted}>{subtitle}</Text> : null}
      {stats.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {stats.map((stat) => (
            <View
              key={`${stat.label}-${stat.value}`}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                justifyContent: "center",
                borderRadius: radii.pill,
                backgroundColor: palette.white,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text variant="heading" color={accentTextColor(accent)}>
                {stat.value}
              </Text>
              <Text variant="caption" color={palette.muted}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export interface CountdownChipProps {
  readonly targetTime: Date | string | number;
  readonly now?: Date | string | number;
  readonly labelPrefix?: string;
}

export function CountdownChip({ targetTime, now, labelPrefix = "Pickup" }: CountdownChipProps) {
  const parts = formatCountdownParts(targetTime, now);
  const tone: StatusTone = parts.tone === "danger" ? "danger" : parts.tone === "warning" ? "warning" : "neutral";

  return (
    <Badge
      tone={tone}
      label={`${labelPrefix}: ${parts.label}`}
      icon={
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{
            width: 7,
            height: 7,
            borderRadius: radii.pill,
            backgroundColor: toneColors(tone).fg,
          }}
        />
      }
    />
  );
}

export interface FilterChip {
  readonly id: string;
  readonly label: string;
  readonly selected?: boolean;
  readonly disabled?: boolean;
}

export interface FilterChipRowProps {
  readonly chips: readonly FilterChip[];
  readonly onSelect: (id: string) => void;
  readonly accent?: string;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function FilterChipRow({
  chips,
  onSelect,
  accent = accents.customer,
  accessibilityLabel = "Filters",
  style,
}: FilterChipRowProps) {
  const reduceMotion = useReducedMotion();

  return (
    <View accessible accessibilityRole="menu" accessibilityLabel={accessibilityLabel} style={[{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, style]}>
      {chips.map((chip) => (
        <Pressable
          key={chip.id}
          accessibilityRole="button"
          accessibilityState={{ selected: Boolean(chip.selected), disabled: Boolean(chip.disabled) }}
          accessibilityLabel={chip.label}
          disabled={chip.disabled}
          onPress={() => onSelect(chip.id)}
          style={({ pressed }) => [
            {
              minHeight: MIN_TOUCH_TARGET,
              justifyContent: "center",
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: chip.selected ? accent : palette.border,
              backgroundColor: chip.selected ? accent : palette.white,
              paddingHorizontal: spacing.md,
              opacity: chip.disabled ? 0.5 : 1,
            },
            pressed ? getPressFeedbackStyle(reduceMotion) : null,
          ]}
        >
          <Text variant="label" color={chip.selected ? palette.white : palette.charcoal}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export interface SegmentedToggleOption {
  readonly id: string;
  readonly label: string;
}

export interface SegmentedToggleProps {
  readonly options: readonly SegmentedToggleOption[];
  readonly selectedId: string;
  readonly onChange: (id: string) => void;
  readonly accent?: string;
  readonly accessibilityLabel?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function SegmentedToggle({
  options,
  selectedId,
  onChange,
  accent = accents.customer,
  accessibilityLabel = "View mode",
  style,
}: SegmentedToggleProps) {
  return (
    <View
      accessible
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: "row",
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.white,
          padding: spacing.xs,
          gap: spacing.xs,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: selected ? accent : "transparent",
              paddingHorizontal: spacing.md,
            }}
          >
            <Text variant="label" color={selected ? palette.white : palette.charcoal}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface StickyActionBarProps {
  readonly primaryLabel: string;
  readonly onPrimaryPress: () => void;
  readonly disabled?: boolean;
  readonly helperText?: string;
  readonly children?: ReactNode;
  readonly accent?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function StickyActionBar({
  primaryLabel,
  onPrimaryPress,
  disabled = false,
  helperText,
  children,
  accent = accents.customer,
  style,
}: StickyActionBarProps) {
  return (
    <View
      style={[
        {
          gap: spacing.sm,
          borderTopWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.white,
          padding: spacing.lg,
        },
        elevation.lg,
        style,
      ]}
    >
      {children}
      {helperText ? <Text color={palette.muted}>{helperText}</Text> : null}
      <Button label={primaryLabel} onPress={onPrimaryPress} disabled={disabled} accent={accent} />
    </View>
  );
}

export interface PeekBarProps {
  readonly title: string;
  readonly detail?: string;
  readonly actionLabel: string;
  readonly onPress: () => void;
  readonly accent?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function PeekBar({ title, detail, actionLabel, onPress, accent = accents.customer, style }: PeekBarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}. ${actionLabel}` : `${title}. ${actionLabel}`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          borderRadius: radii.lg,
          backgroundColor: accent,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        elevation.md,
        pressed ? getPressFeedbackStyle(reduceMotion) : null,
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="label" color={palette.white} numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text variant="caption" color={palette.cream} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Text variant="label" color={palette.white}>
        {actionLabel}
      </Text>
    </Pressable>
  );
}

export interface ProgressRingProps {
  readonly value: number;
  readonly label?: string;
  readonly size?: number;
  readonly accent?: string;
}

export function ProgressRing({ value, label, size = 96, accent = palette.gold }: ProgressRingProps) {
  const percent = progressPercent(value);
  const innerSize = Math.max(48, size - 18);
  const trackWidth = Math.max(40, innerSize * 0.62);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Progress"}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ alignItems: "center", gap: spacing.sm }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 8,
          borderColor: accent,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.cream,
        }}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.xs,
            backgroundColor: palette.white,
          }}
        >
          <Text variant="title" color={accentTextColor(accent)}>
            {percent}%
          </Text>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              width: trackWidth,
              height: 5,
              overflow: "hidden",
              borderRadius: radii.pill,
              backgroundColor: palette.border,
            }}
          >
            <View
              style={{
                width: `${percent}%`,
                height: "100%",
                borderRadius: radii.pill,
                backgroundColor: accent,
              }}
            />
          </View>
        </View>
      </View>
      {label ? (
        <Text variant="caption" color={palette.muted} style={{ textAlign: "center" }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export interface LoyaltyCardStat {
  readonly label: string;
  readonly value: string;
}

export interface LoyaltyCardProps {
  readonly tier: string;
  readonly title?: string;
  readonly progress: number;
  readonly progressLabel?: string;
  readonly stats?: readonly LoyaltyCardStat[];
  readonly accent?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function LoyaltyCard({
  tier,
  title = "Zayka Passport",
  progress,
  progressLabel,
  stats = [],
  accent = palette.gold,
  style,
}: LoyaltyCardProps) {
  return (
    <Card elevated="md" style={[{ backgroundColor: palette.cream, borderColor: accent }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
        <ProgressRing value={progress} label={progressLabel} accent={accent} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="caption" color={accentTextColor(accent)}>
            {title}
          </Text>
          <Text variant="title">{tier}</Text>
          {stats.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {stats.map((stat) => (
                <View key={`${stat.label}-${stat.value}`} style={{ minWidth: 96 }}>
                  <Text variant="heading" color={palette.charcoal}>
                    {stat.value}
                  </Text>
                  <Text variant="caption" color={palette.muted}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
