import { Placeholder } from "@/ui/Placeholder";

export default function HomeScreen() {
  return (
    <Placeholder
      title="goZaika"
      subtitle="Hyderabad-first discovery of chef-curated BAM Bags. Hero, search, active kitchens and Passport teaser arrive in Mobile Slice 8."
      slice="Slice 8"
      links={[
        { label: "Sign in with phone OTP", href: "/auth/login" },
        { label: "Privacy & consent", href: "/onboarding/consent" },
        { label: "Swaad Club", href: "/swaad-club" },
      ]}
    />
  );
}
