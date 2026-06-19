import { Placeholder } from "@/ui/Placeholder";

export default function DropsScreen() {
  return (
    <Placeholder
      title="Drops"
      subtitle="List active/scheduled/closed drops with status and sell-through. Create/duplicate/publish arrive in Mobile Slice 13."
      slice="Slice 13"
      links={[
        { label: "Create a drop", href: "/drops/new" },
        { label: "View a drop", href: "/drops/D11" },
      ]}
    />
  );
}
