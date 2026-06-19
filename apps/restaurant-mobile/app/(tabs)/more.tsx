import { Placeholder } from "@/ui/Placeholder";

export default function MoreScreen() {
  return (
    <Placeholder
      title="More"
      subtitle="Management destinations. Role-based visibility (OWNER/ADMIN/OPERATIONS/PICKUP_STAFF/FINANCE) is enforced server-side in Mobile Slice 4 and surfaced here."
      slice="Slice 12 – 15"
      links={[
        { label: "Templates", href: "/templates" },
        { label: "ROI reports", href: "/reports" },
        { label: "Finance", href: "/finance" },
        { label: "Onboarding", href: "/onboarding" },
        { label: "Compliance", href: "/compliance" },
        { label: "Profile", href: "/profile" },
        { label: "Reviews", href: "/reviews" },
        { label: "Sign in", href: "/auth/login" },
      ]}
    />
  );
}
