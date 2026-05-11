import { ShellHeader } from "@gozaika/ui";

export default async function CityPage({ params }: { readonly params: Promise<{ readonly city: string }> }) {
  const { city } = await params;

  return (
    <main>
      <ShellHeader />
      <section className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-4xl font-bold">BAM Bags in {city}</h1>
        <p className="mt-3 text-[#2D2D2D]/70">City pages will combine neighborhoods, restaurant stories, and safe public drop views.</p>
      </section>
    </main>
  );
}
