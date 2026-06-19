import { Placeholder } from "@/ui/Placeholder";

export default function CounterScreen() {
  return (
    <Placeholder
      title="Pickup counter"
      subtitle="Role-safe orders queue, camera QR + manual OTP verification, no-show and incidents with bounded offline behavior arrive in Mobile Slice 7."
      slice="Slice 7"
      links={[{ label: "Open an order", href: "/orders/O26" }]}
    />
  );
}
