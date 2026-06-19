import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/ui/Placeholder";

export default function RestaurantProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <Placeholder
      title="Restaurant profile"
      subtitle={`Public identity, cuisines, rating, active drops and approved reviews for "${slug ?? ""}". Arrives in Mobile Slice 8.`}
      slice="Slice 8"
    />
  );
}
