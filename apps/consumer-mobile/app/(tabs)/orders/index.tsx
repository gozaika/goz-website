import { Placeholder } from "@/ui/Placeholder";

export default function OrdersScreen() {
  return (
    <Placeholder
      title="Your orders"
      subtitle="Active pickup orders and history with notification status. Offline pickup proof (QR/OTP) arrives in Mobile Slice 9."
      slice="Slice 9 / 10"
      links={[{ label: "View an order", href: "/orders/O26" }]}
    />
  );
}
