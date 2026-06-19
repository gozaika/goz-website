import { Placeholder } from "@/ui/Placeholder";

export default function RestaurantsScreen() {
  return (
    <Placeholder
      title="Restaurants"
      subtitle="Directory with search, sort, rating and cuisine filters plus list/map toggle arrives in Mobile Slice 8."
      slice="Slice 8"
      links={[{ label: "View a restaurant", href: "/restaurants/bawarchi-biryani-palace" }]}
    />
  );
}
