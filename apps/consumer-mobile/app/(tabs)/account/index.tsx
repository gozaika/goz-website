import { Placeholder } from "@/ui/Placeholder";

export default function AccountScreen() {
  return (
    <Placeholder
      title="Account"
      subtitle="Profile, referral code, consent settings, holds and sign-out arrive in Mobile Slice 10."
      slice="Slice 10"
      links={[
        { label: "Zayka Passport", href: "/account/passport" },
        { label: "Flavour Diversity profile", href: "/account/discovery" },
        { label: "Sign in", href: "/auth/login" },
      ]}
    />
  );
}
