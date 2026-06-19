import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/ui/Placeholder";

export default function DropDetailScreen() {
  const { dropPk } = useLocalSearchParams<{ dropPk: string }>();
  return (
    <Placeholder
      title="Drop detail"
      subtitle={`Allergen disclosure, pickup window and claim CTA for "${dropPk ?? ""}". Claim → Razorpay → pickup proof arrive in Mobile Slice 9.`}
      slice="Slice 8 / 9"
      links={[{ label: "Continue to checkout", href: "/checkout/H01" }]}
    />
  );
}
