import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, Screen, Text, palette } from "@gozaika/mobile-ui";
import { formatPaise } from "@gozaika/utils";
import { ActivityIndicator, View } from "react-native";
import { useTemplates } from "@/api/catalog";
import { useAuth } from "@/auth/useAuth";

export default function TemplatesScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch } = useTemplates(selectedRestaurantPk);
  const templates = data?.templates ?? [];

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to view templates." />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={palette.forest} />
      </Screen>
    );
  }
  if (isError && templates.length === 0) {
    const code = error instanceof ApiError ? error.code : null;
    return (
      <Screen>
        <ErrorState
          title={code === "ROLE_DENIED" ? "Not available for your role" : undefined}
          message={error instanceof ApiError ? error.message : "Could not load templates."}
          onRetry={code === "ROLE_DENIED" ? undefined : () => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="title">BAM Bag templates</Text>
      <Text variant="body" color={palette.muted}>
        Templates are authored on the web portal. Publish drops from them in the Drops tab.
      </Text>
      {templates.length === 0 ? (
        <EmptyState title="No templates yet" message="Create a BAM Bag template on the web portal." />
      ) : (
        templates.map((t) => (
          <Card key={t.templatePk}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text variant="heading">{t.displayName ?? t.templateName}</Text>
              <Badge label={t.templateStatusCode} tone={t.templateStatusCode === "ACTIVE" ? "success" : "neutral"} />
            </View>
            {t.shortDescription ? (
              <Text variant="caption" color={palette.muted}>
                {t.shortDescription}
              </Text>
            ) : null}
            <Text variant="caption" color={palette.muted}>
              {[t.dietaryCategoryCode, t.spiceLevelCode].filter(Boolean).join(" · ") || "—"}
              {t.allergenSummaryText ? ` · ${t.allergenSummaryText}` : ""}
            </Text>
            <Text variant="caption" color={palette.muted}>
              Suggested {t.suggestedPricePaise ? formatPaise(t.suggestedPricePaise) : "—"} · default {t.defaultDropQuantity} bags
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
