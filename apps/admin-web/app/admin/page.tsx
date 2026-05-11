const modules = [
  "Restaurant onboarding",
  "User management",
  "Orders",
  "Billing and settlements",
  "Configuration",
  "Incidents and support",
  "Monitoring",
  "Data correction",
  "Exports",
  "CMS",
];

export default function AdminPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-black/10 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">goZaika Admin</h1>
        <p className="text-sm text-slate-600">Server-side service-role operations only.</p>
      </header>
      <section className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <article key={module} className="rounded-lg border border-black/10 bg-white p-4">
            <h2 className="font-semibold">{module}</h2>
            <p className="mt-2 text-sm text-slate-600">Audit trail, pagination, confirmation, and role checks scaffold.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
