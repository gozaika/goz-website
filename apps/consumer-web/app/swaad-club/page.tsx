import { ShellHeader } from "@gozaika/ui";
import { Bell, Crown, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

const benefits = [
  ["Priority signals", "Early notice when a Limited Drop is scheduled in your preferred neighborhoods."],
  ["Chef's Selection previews", "Member-first context on cuisine style, dietary category, and pickup window."],
  ["Trust-first reminders", "Clear allergen and pickup reminders before you claim, with DPDP consent controls intact."],
  ["Launch perks", "Founding Hyderabad members get priority access offers when subscription billing is activated."],
] as const;

const faqs = [
  ["Can I subscribe today?", "Not yet. Live recurring billing is deferred until the subscription backend and compliance path are activated."],
  ["Does this grant priority access now?", "No fake entitlement is shown. This page is subscription-ready product positioning with a safe launch waitlist CTA."],
  ["Will phone OTP still work?", "Yes. Phone OTP remains the primary mobile login path; Google OAuth is an optional account access path when configured."],
] as const;

export default function SwaadClubPage() {
  return (
    <main>
      <ShellHeader>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link href="/drops">Drops</Link>
          <Link href="/restaurants">Restaurants</Link>
          <Link href="/account">Account</Link>
        </nav>
      </ShellHeader>
      <section className="bg-[#FFF8F0]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#D4A017]">Swaad Club</p>
            <h1 className="mt-3 max-w-3xl text-5xl font-bold leading-tight text-[#2D2D2D]">
              Priority access for Hyderabad&apos;s first BAM Bag explorers.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#2D2D2D]/75">
              Built for diners who want smarter access to off-menu discovery: early alerts, member-first drop context, and
              launch benefits without turning goZaika into a discount club.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center rounded-lg bg-[#FF6B35] px-5 text-sm font-semibold text-white" href="/account">
                Notify me from account
              </Link>
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[#1A5C38]/25 px-5 text-sm font-semibold text-[#1A5C38]" href="/drops">
                Browse current drops
              </Link>
            </div>
          </div>
          <aside className="rounded-lg border border-[#D4A017]/40 bg-white p-5 shadow-sm">
            <Crown className="h-9 w-9 text-[#D4A017]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold text-[#2D2D2D]">Coming soon</h2>
            <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/70">
              Razorpay recurring subscriptions are not enabled in this slice. No payment mandate, renewal, or entitlement
              is created from this page.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map(([title, body], index) => {
            const Icon = [Sparkles, Bell, ShieldCheck, Crown][index]!;
            return (
              <article key={title} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <Icon className="h-6 w-6 text-[#1A5C38]" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-[#2D2D2D]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/68">{body}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-8 rounded-lg border border-[#1A5C38]/20 bg-[#F2F8EF] p-5">
          <h2 className="text-2xl font-bold text-[#2D2D2D]">Eligibility and boundary</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#2D2D2D]/70">
            Swaad Club starts as a launch waitlist/notification promise. Paid membership, priority queue ordering,
            renewal, cancellation, and invoice handling belong to the next revenue slice after backend activation.
          </p>
        </section>

        <section className="mt-8 grid gap-3">
          <h2 className="text-2xl font-bold text-[#2D2D2D]">FAQs</h2>
          {faqs.map(([question, answer]) => (
            <details key={question} className="rounded-lg border border-black/10 bg-white p-4">
              <summary className="cursor-pointer font-semibold text-[#2D2D2D]">{question}</summary>
              <p className="mt-2 text-sm leading-6 text-[#2D2D2D]/68">{answer}</p>
            </details>
          ))}
        </section>
      </section>
    </main>
  );
}
