const kpis = [
  ["Today's revenue", "\u20B918,450"],
  ["Active drops", "3"],
  ["Pending pickup", "27"],
  ["Sell-through", "82%"],
];

const checklist = ["Profile", "Compliance docs", "Payout info", "First BAM Bag template", "First drop"];

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-black/10 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-[#1A5C38]">Zayka Pro</h1>
      </header>
      <section className="grid gap-6 px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          {kpis.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-black/10 bg-white p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Active pickup window</h2>
            <p className="mt-2 text-sm text-slate-600">No pickups pending for this window.</p>
          </section>
          <section className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Onboarding checklist</h2>
            <div className="mt-4 grid gap-2">
              {checklist.map((item) => (
                <label key={item} className="flex items-center gap-3 rounded-md border border-black/10 px-3 py-2">
                  <input type="checkbox" /> {item}
                </label>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
