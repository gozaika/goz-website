import { useLocalSearchParams } from "expo-router";
import { Placeholder } from "@/ui/Placeholder";

// Native route /checkout/[holdPk] maps to the web /checkout/[orderId] route whose
// param is actually a hold primary key (customer spec §4). Name normalized here.
export default function CheckoutScreen() {
  const { holdPk } = useLocalSearchParams<{ holdPk: string }>();
  return (
    <Placeholder
      title="Checkout"
      subtitle={`Hold summary, countdown and native Razorpay for hold "${holdPk ?? ""}". Webhook-confirmed payment arrives in Mobile Slice 9.`}
      slice="Slice 9"
    />
  );
}
