import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { getPressFeedbackStyle, useReducedMotion } from "../motion";
import { accents, palette, type StatusTone } from "../tokens/colors";
import { accentTextColor } from "../tokens/contrast";
import { elevation, MIN_TOUCH_TARGET, radii, spacing } from "../tokens/layout";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card } from "./Card";
import { basisPointsToRatio, clampRatio, formatRatioPercent, normalizeSparkline } from "./partnerPrimitivesModel";
import { Text } from "./Text";

export interface MetricHeroProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly value: string;
  readonly helper?: string;
  readonly badgeLabel?: string;
  readonly badgeTone?: StatusTone;
  readonly accent?: string;
  readonly children?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export function MetricHero({
  eyebrow,
  title,
  value,
  helper,
  badgeLabel,
  badgeTone = "neutral",
  accent = accents.restaurant,
  children,
  style,
}: MetricHeroProps) {
  return (
    <Card elevated="md" style={[{ borderColor: accent, backgroundColor: palette.white }, style]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          {eyebrow ? (
            <Text variant="caption" color={accentTextColor(accent)} style={{ textTransform: "uppercase" }}>
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="label" color={palette.muted}>
            {title}
          </Text>
          <Text variant="display" color={accentTextColor(accent)} accessibilityRole="header">
            {value}
          </Text>
          {helper ? <Text color={palette.muted}>{helper}</Text> : null}
        </View>
        {badgeLabel ? <Badge label={badgeLabel} tone={badgeTone} /> : null}
      </View>
      {children}
    </Card>
  );
}

export interface ActionCardProps {
  readonly title: string;
  readonly detail?: string;
  readonly actionLabel?: string;
  readonly onPress?: () => void;
  readonly tone?: StatusTone;
  readonly accent?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function ActionCard({
  title,
  detail,
  actionLabel,
  onPress,
  tone = "neutral",
  accent = accents.restaurant,
  style,
}: ActionCardProps) {
  const reduceMotion = useReducedMotion();
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          gap: spacing.sm,
          borderLeftWidth: 4,
          borderLeftColor: tone === "warning" ? palette.warningFg : tone === "danger" ? palette.dangerFg : accent,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.white,
          padding: spacing.lg,
        },
        elevation.sm,
        pressed ? getPressFeedbackStyle(reduceMotion) : null,
        style,
      ]}
    >
      <Text variant="heading">{title}</Text>
      {detail ? <Text color={palette.muted}>{detail}</Text> : null}
      {actionLabel ? (
        <Text variant="label" color={accentTextColor(accent)}>
          {actionLabel}
        </Text>
      ) : null}
    </Wrapper>
  );
}

export interface QueueCardProps {
  readonly orderNumber: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly statusTone?: StatusTone;
  readonly detailLines?: readonly string[];
  readonly amountLabel?: string;
  readonly incidentLabel?: string;
  readonly selected?: boolean;
  readonly onPress?: () => void;
  readonly accent?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function QueueCard({
  orderNumber,
  title,
  statusLabel,
  statusTone = "neutral",
  detailLines = [],
  amountLabel,
  incidentLabel,
  selected = false,
  onPress,
  accent = accents.restaurant,
  style,
}: QueueCardProps) {
  const reduceMotion = useReducedMotion();
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected }}
      accessibilityLabel={`Order ${orderNumber}. ${title}. ${statusLabel}`}
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        {
          gap: spacing.sm,
          borderRadius: radii.md,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? accent : palette.border,
          backgroundColor: palette.white,
          padding: spacing.lg,
        },
        selected ? elevation.md : elevation.sm,
        pressed ? getPressFeedbackStyle(reduceMotion) : null,
        style,
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <Text variant="heading">{orderNumber}</Text>
        <Badge label={statusLabel} tone={statusTone} />
      </View>
      <Text>{title}</Text>
      {detailLines.map((line) => (
        <Text key={line} variant="caption" color={palette.muted}>
          {line}
        </Text>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        {incidentLabel ? <Badge label={incidentLabel} tone="warning" /> : <View />}
        {amountLabel ? <Text variant="label">{amountLabel}</Text> : null}
      </View>
    </Wrapper>
  );
}

export interface SellThroughBarProps {
  readonly sold: number;
  readonly total: number;
  readonly label?: string;
  readonly accent?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function SellThroughBar({ sold, total, label, accent = accents.restaurant, style }: SellThroughBarProps) {
  const ratio = total > 0 ? clampRatio(sold / total) : 0;
  const percent = formatRatioPercent(ratio);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Sell-through"}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100), text: `${sold}/${total}` }}
      style={[{ gap: spacing.xs }, style]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <Text variant="caption" color={palette.muted}>
          {label ?? "Sell-through"}
        </Text>
        <Text variant="caption" color={palette.muted}>
          {sold}/{total} · {percent}
        </Text>
      </View>
      <View style={{ height: 8, overflow: "hidden", borderRadius: radii.pill, backgroundColor: palette.border }}>
        <View style={{ width: `${Math.round(ratio * 100)}%`, height: "100%", backgroundColor: accent }} />
      </View>
    </View>
  );
}

export interface SparklineProps {
  readonly values: readonly number[];
  readonly label: string;
  readonly accent?: string;
  readonly height?: number;
}

export function Sparkline({ values, label, accent = accents.restaurant, height = 42 }: SparklineProps) {
  const normalized = normalizeSparkline(values);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ height, flexDirection: "row", alignItems: "flex-end", gap: spacing.xs }}>
      {normalized.length ? (
        normalized.map((value, index) => (
          <View
            key={`${index}-${value}`}
            style={{
              flex: 1,
              minWidth: 4,
              height: Math.max(4, height * value),
              borderRadius: radii.pill,
              backgroundColor: accent,
              opacity: 0.42 + value * 0.58,
            }}
          />
        ))
      ) : (
        <Text variant="caption" color={palette.muted}>
          No trend data
        </Text>
      )}
    </View>
  );
}

export interface DataTableRow {
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
  readonly tone?: StatusTone;
}

export interface DataTableProps {
  readonly rows: readonly DataTableRow[];
  readonly title?: string;
  readonly style?: StyleProp<ViewStyle>;
}

export function DataTable({ rows, title, style }: DataTableProps) {
  return (
    <Card style={style}>
      {title ? <Text variant="heading">{title}</Text> : null}
      {rows.map((row) => (
        <View
          key={`${row.label}-${row.value}`}
          style={{
            minHeight: MIN_TOUCH_TARGET,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
            borderTopWidth: title || rows.indexOf(row) > 0 ? 1 : 0,
            borderColor: palette.border,
            paddingVertical: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="label">{row.label}</Text>
            {row.helper ? (
              <Text variant="caption" color={palette.muted}>
                {row.helper}
              </Text>
            ) : null}
          </View>
          <Text variant="heading" color={row.tone === "warning" ? palette.warningFg : row.tone === "danger" ? palette.dangerFg : palette.charcoal}>
            {row.value}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export interface RoleAwareSectionProps {
  readonly allowed: boolean;
  readonly children: ReactNode;
  readonly fallbackTitle?: string;
  readonly fallbackMessage?: string;
}

export function RoleAwareSection({
  allowed,
  children,
  fallbackTitle = "Not available for this role",
  fallbackMessage = "Your server role controls which partner data is shown here.",
}: RoleAwareSectionProps) {
  if (allowed) {
    return <>{children}</>;
  }

  return (
    <Card style={{ backgroundColor: palette.cream }}>
      <Text variant="heading">{fallbackTitle}</Text>
      <Text color={palette.muted}>{fallbackMessage}</Text>
    </Card>
  );
}

export interface RestaurantSwitcherItem {
  readonly id: string;
  readonly name: string;
  readonly roleLabel?: string;
  readonly statusLabel?: string;
}

export interface RestaurantSwitcherProps {
  readonly restaurants: readonly RestaurantSwitcherItem[];
  readonly selectedId?: string | null;
  readonly onSelect: (id: string) => void;
  readonly accent?: string;
}

export function RestaurantSwitcher({
  restaurants,
  selectedId,
  onSelect,
  accent = accents.restaurant,
}: RestaurantSwitcherProps) {
  const reduceMotion = useReducedMotion();

  return (
    <View accessibilityRole="menu" accessibilityLabel="Restaurant switcher" style={{ gap: spacing.sm }}>
      {restaurants.map((restaurant) => {
        const selected = restaurant.id === selectedId;
        return (
          <Pressable
            key={restaurant.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={restaurant.name}
            onPress={() => onSelect(restaurant.id)}
            style={({ pressed }) => [
              {
                minHeight: MIN_TOUCH_TARGET,
                gap: spacing.xs,
                borderRadius: radii.md,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? accent : palette.border,
                backgroundColor: palette.white,
                padding: spacing.md,
              },
              pressed ? getPressFeedbackStyle(reduceMotion) : null,
            ]}
          >
            <Text variant="heading">{restaurant.name}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {restaurant.roleLabel ? <Badge label={restaurant.roleLabel} tone="info" /> : null}
              {restaurant.statusLabel ? <Badge label={restaurant.statusLabel} tone={selected ? "success" : "neutral"} /> : null}
            </View>
          </Pressable>
        );
      })}
      {!restaurants.length ? (
        <Text color={palette.muted}>No restaurants available for this account.</Text>
      ) : null}
    </View>
  );
}

export { basisPointsToRatio };
