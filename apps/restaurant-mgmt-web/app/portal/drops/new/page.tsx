const steps = ["Template", "Quantity and price", "Pickup window", "Audience", "Media", "Preview"];

export default function NewDropPage() {
  return (
    <main className="px-6 py-6">
      <h1 className="text-3xl font-bold">Create a BAM Bag drop</h1>
      <div className="mt-6 grid gap-3">
        {steps.map((step, index) => (
          <section key={step} className="rounded-lg border border-black/10 bg-white p-4">
            <p className="text-sm font-semibold text-[#1A5C38]">Step {index + 1}</p>
            <h2 className="mt-1 text-lg font-bold">{step}</h2>
          </section>
        ))}
      </div>
    </main>
  );
}
