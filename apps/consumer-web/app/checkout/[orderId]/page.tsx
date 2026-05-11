import { ShellHeader } from "@gozaika/ui";

export default async function CheckoutPage({ params }: { readonly params: Promise<{ readonly orderId: string }> }) {
  const { orderId } = await params;

  return (
    <main>
      <ShellHeader />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-4xl font-bold">Payment is being confirmed</h1>
        <p className="mt-3 text-[#2D2D2D]/70">Order {orderId}. Razorpay webhook verification is the source of truth.</p>
        <div className="mt-6 rounded-lg border border-black/10 bg-white p-6">
          <div className="grid aspect-square max-w-xs place-items-center rounded-lg border border-dashed border-[#1A5C38] text-center font-semibold">
            QR appears after verified payment
          </div>
        </div>
      </section>
    </main>
  );
}
