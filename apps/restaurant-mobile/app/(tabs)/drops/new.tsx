import { ApiError } from "@gozaika/mobile-core";
import { Badge, Button, Card, EmptyState, Screen, Text, palette, toneColors } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import type { TemplateSummary } from "@gozaika/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { usePublishDrop, useTemplates } from "@/api/catalog";
import { useAuth } from "@/auth/useAuth";

const inputStyle = {
  borderWidth: 1,
  borderColor: palette.border,
  borderRadius: 10,
  padding: 12,
  backgroundColor: palette.white,
  color: palette.charcoal,
  fontSize: 16,
} as const;

type DropStatus = "DRAFT" | "SCHEDULED" | "ACTIVE";

function pickupWindow(template: TemplateSummary, dayOffset: number): { start: Date; end: Date } {
  const base = new Date();
  base.setSeconds(0, 0);
  base.setMinutes(0);
  base.setHours(base.getHours() + 1);
  base.setDate(base.getDate() + dayOffset);
  const start = new Date(base.getTime() + template.defaultPickupStartOffsetMinutes * 60_000);
  const end = new Date(start.getTime() + template.defaultPickupDurationMinutes * 60_000);
  return { start, end };
}

function fmt(d: Date): string {
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function NewDropScreen() {
  const { selectedRestaurantPk } = useAuth();
  const router = useRouter();
  const templatesQuery = useTemplates(selectedRestaurantPk);
  const publish = usePublishDrop(selectedRestaurantPk);

  const [selected, setSelected] = useState<TemplateSummary | null>(null);
  const [quantity, setQuantity] = useState("");
  const [rupees, setRupees] = useState("");
  const [dayOffset, setDayOffset] = useState(0);
  const [status, setStatus] = useState<DropStatus>("SCHEDULED");

  const templates = (templatesQuery.data?.templates ?? []).filter((t) => t.activeRevisionPk);

  function choose(t: TemplateSummary) {
    setSelected(t);
    setQuantity(String(t.defaultDropQuantity));
    setRupees(t.suggestedPricePaise ? String(Math.round(t.suggestedPricePaise / 100)) : "");
    setDayOffset(0);
  }

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home first." />
      </Screen>
    );
  }
  if (templatesQuery.isLoading) {
    return (
      <Screen contentStyle={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={palette.forest} />
      </Screen>
    );
  }
  if (templates.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No active templates"
          message="Create a BAM Bag template on the web portal first, then publish drops from it here."
        />
      </Screen>
    );
  }

  const win = selected ? pickupWindow(selected, dayOffset) : null;
  const qty = Number(quantity);
  const paise = Math.round(Number(rupees) * 100);
  const canPublish = Boolean(selected?.activeRevisionPk) && qty >= 1 && paise >= 100;

  return (
    <Screen>
      <Text variant="title">New drop</Text>

      <Text variant="heading">1 · Choose a template</Text>
      {templates.map((t) => {
        const active = selected?.templatePk === t.templatePk;
        return (
          <Pressable key={t.templatePk} onPress={() => choose(t)}>
            <Card style={{ borderColor: active ? palette.forest : palette.border, borderWidth: active ? 2 : 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text variant="heading">{t.displayName ?? t.templateName}</Text>
                {t.dietaryCategoryCode ? <Badge label={t.dietaryCategoryCode} tone="neutral" /> : null}
              </View>
              {t.shortDescription ? (
                <Text variant="caption" color={palette.muted}>
                  {t.shortDescription}
                </Text>
              ) : null}
              <Text variant="caption" color={palette.muted}>
                Suggested {t.suggestedPricePaise ? formatPaise(t.suggestedPricePaise) : "—"} · default {t.defaultDropQuantity} bags
              </Text>
            </Card>
          </Pressable>
        );
      })}

      {selected ? (
        <>
          <Text variant="heading">2 · Quantity & price</Text>
          <Text variant="caption" color={palette.muted}>
            Bags
          </Text>
          <TextInput
            style={inputStyle}
            value={quantity}
            onChangeText={(v) => setQuantity(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="e.g. 10"
            placeholderTextColor={palette.muted}
          />
          <Text variant="caption" color={palette.muted}>
            Price per bag (₹)
          </Text>
          <TextInput
            style={inputStyle}
            value={rupees}
            onChangeText={(v) => setRupees(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="e.g. 149"
            placeholderTextColor={palette.muted}
          />

          <Text variant="heading">3 · Pickup window</Text>
          {win ? (
            <Text variant="body">
              {fmt(win.start)} → {fmt(win.end)}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Earlier day" variant="secondary" accent={palette.forest} disabled={dayOffset <= 0} onPress={() => setDayOffset((d) => Math.max(0, d - 1))} />
            <Button label="Later day" variant="secondary" accent={palette.forest} onPress={() => setDayOffset((d) => d + 1)} />
          </View>

          <Text variant="heading">4 · Publish as</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["DRAFT", "SCHEDULED", "ACTIVE"] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={{
                  borderWidth: 1,
                  borderColor: status === s ? palette.forest : palette.border,
                  backgroundColor: status === s ? palette.forest : palette.white,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text variant="caption" color={status === s ? palette.white : palette.muted}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            label={status === "ACTIVE" ? "Publish drop" : status === "SCHEDULED" ? "Schedule drop" : "Save draft"}
            accent={palette.forest}
            disabled={!canPublish}
            loading={publish.isPending}
            onPress={() => {
              if (!selected?.activeRevisionPk || !win) return;
              publish.mutate(
                {
                  templateRevisionPk: selected.activeRevisionPk,
                  quantityTotal: qty,
                  pricePaise: paise,
                  pickupStartAt: win.start.toISOString(),
                  pickupEndAt: win.end.toISOString(),
                  statusCode: status,
                },
                { onSuccess: () => router.back() },
              );
            }}
          />
          {publish.isError ? (
            <View style={{ backgroundColor: toneColors("danger").bg, borderRadius: 10, padding: 12 }}>
              <Text variant="caption" color={toneColors("danger").fg}>
                {publish.error instanceof ApiError ? publish.error.message : "Could not publish. Please try again."}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
