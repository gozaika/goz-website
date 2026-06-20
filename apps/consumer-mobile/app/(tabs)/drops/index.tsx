import { EmptyState, ErrorState, Screen, Skeleton, spacing } from "@gozaika/mobile-ui";
import { useRouter } from "expo-router";
import { FlatList, View } from "react-native";
import { useDrops } from "@/api/discovery";
import { DropCard } from "@/ui/DropCard";

export default function DropsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useDrops();

  if (isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message="We couldn't load today's drops." onRetry={() => refetch()} />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen contentStyle={{ gap: spacing.md }}>
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (!data || data.length === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState title="No active drops" message="Check back soon for today's BAM Bags." />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
      <FlatList
        data={data}
        keyExtractor={(d) => d.dropPk}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        renderItem={({ item }) => <DropCard drop={item} onPress={() => router.push(`/drops/${item.dropPk}`)} />}
      />
    </View>
  );
}
