import { Placeholder } from "@/ui/Placeholder";

export default function DropsScreen() {
  return (
    <Placeholder
      title="Limited Drops"
      subtitle="Search, category and dietary filters, list/map toggle, live countdown and Adventure Pick arrive in Mobile Slice 8."
      slice="Slice 8"
      links={[{ label: "View a drop", href: "/drops/D11" }]}
    />
  );
}
