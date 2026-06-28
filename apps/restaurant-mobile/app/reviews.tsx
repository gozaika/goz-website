import { ApiError } from "@gozaika/mobile-core";
import { Badge, Card, EmptyState, ErrorState, MetricHero, palette, Screen, Skeleton, spacing, Text, type StatusTone } from "@gozaika/mobile-ui";
import { View } from "react-native";
import { useRestaurantReviews } from "@/api/reviews";
import { useAuth } from "@/auth/useAuth";

function statusTone(code: string): StatusTone {
  const c = code.toUpperCase();
  if (c === "APPROVED") return "success";
  if (c === "REJECTED") return "danger";
  return "warning"; // PENDING
}

function statusLabel(code: string): string {
  const c = code.toUpperCase();
  if (c === "APPROVED") return "Published";
  if (c === "REJECTED") return "Not approved";
  return "In moderation";
}

function Stars({ value }: { readonly value: number }) {
  return (
    <View style={{ flexDirection: "row" }} accessibilityLabel={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Text key={n} variant="label" color={n <= value ? palette.gold : palette.border}>
          ★
        </Text>
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const { selectedRestaurantPk } = useAuth();
  const { data, isLoading, isError, error, refetch } = useRestaurantReviews(selectedRestaurantPk);

  if (!selectedRestaurantPk) {
    return (
      <Screen>
        <EmptyState title="Select a restaurant" message="Choose a restaurant from Home to view reviews." />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={120} />
        <Skeleton height={100} />
        <Skeleton height={100} />
      </Screen>
    );
  }
  if (isError && !data) {
    const code = error instanceof ApiError ? error.code : null;
    return (
      <Screen>
        <ErrorState
          title={code === "ROLE_DENIED" ? "Not available for your role" : undefined}
          message={error instanceof ApiError ? error.message : "Could not load reviews."}
          onRetry={code === "ROLE_DENIED" ? undefined : () => refetch()}
        />
      </Screen>
    );
  }

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];

  return (
    <Screen contentStyle={{ gap: spacing.md }}>
      <Text variant="title">Reviews</Text>
      <Text color={palette.muted}>From verified collected orders. Read-only — moderation is handled by goZaika.</Text>

      <MetricHero
        eyebrow="Customer rating"
        title={summary && summary.averageRating != null ? `${summary.averageRating.toFixed(1)} / 5` : "No ratings yet"}
        value={`${summary?.ratingCount ?? 0} review${(summary?.ratingCount ?? 0) === 1 ? "" : "s"}`}
        helper="Across all collected orders for this restaurant."
        badgeLabel="Read-only"
        badgeTone="neutral"
        accent={palette.forest}
      />

      {reviews.length === 0 ? (
        <Card elevated="sm">
          <Text variant="heading">No reviews yet</Text>
          <Text color={palette.muted}>Reviews appear here after customers collect and rate their BAM Bags.</Text>
        </Card>
      ) : (
        reviews.map((r) => (
          <Card key={r.reviewPk} elevated="sm">
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
              <View style={{ gap: 2 }}>
                <Stars value={r.ratingValue} />
                <Text variant="caption" color={palette.muted}>
                  {r.reviewerMasked} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Text>
              </View>
              <Badge label={statusLabel(r.moderationStatusCode)} tone={statusTone(r.moderationStatusCode)} />
            </View>
            {r.reviewText ? (
              <Text variant="body" color={palette.charcoal} style={{ marginTop: spacing.xs }}>
                {r.reviewText}
              </Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
