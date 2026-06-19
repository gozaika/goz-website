import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/ui/Placeholder";

export default function DropDetailScreen() {
  const { dropPk } = useLocalSearchParams<{ dropPk: string }>();
  return (
    <Placeholder
      title="Drop detail"
      subtitle={`Detail/edit and safe status actions for drop "${dropPk ?? ""}". Reuses web /portal/drops/new behaviors. Arrives in Mobile Slice 13.`}
      slice="Slice 13"
    />
  );
}
