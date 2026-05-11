import { ShellHeader } from "@gozaika/ui";

export default async function DropDetailPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params;

  return (
    <main>
      <ShellHeader />
      <section className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm font-bold uppercase text-[#1A5C38]">Drop {id}</p>
        <h1 className="mt-2 text-4xl font-bold">Chef-curated BAM Bag</h1>
        <div className="mt-6 grid gap-4 rounded-lg border border-black/10 bg-white p-6">
          <p>Surprise contents with allergen disclosure, dietary category, spice level, serves, and pickup window shown before purchase.</p>
          <p className="font-semibold text-[#B42318]">Contains disclosed allergens. Review before claiming.</p>
          <button className="min-h-11 rounded-lg bg-[#FF6B35] px-4 font-semibold text-white">Create hold and claim</button>
        </div>
      </section>
    </main>
  );
}
