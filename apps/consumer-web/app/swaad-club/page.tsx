import { ShellHeader } from "@gozaika/ui";
import { Bell, Crown, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { ConsumerNavLinks } from "../consumer-nav";

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
    <main id="main-content">
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>
      <section className="bg-cream">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-gold-text">Swaad Club</p>
            <h1 className="mt-3 max-w-3xl text-5xl font-bold leading-tight text-charcoal">
              Priority access for Hyderabad&apos;s first BAM Bag explorers.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Built for diners who want smarter access to off-menu discovery: early alerts, member-first drop context, and
              launch benefits without turning goZaika into a discount club.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center rounded-lg bg-saffron px-5 text-sm font-semibold text-charcoal" href="/account">
                Notify me from account
              </Link>
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-forest/25 px-5 text-sm font-semibold text-forest" href="/drops">
                Browse current drops
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-gold/40 bg-white p-5 shadow-sm">
            <Crown className="h-9 w-9 text-gold" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold text-charcoal">Coming soon</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Razorpay recurring subscriptions are not enabled in this slice. No payment mandate, renewal, or entitlement
              is created from this page.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map(([title, body], index) => {
            const Icon = [Sparkles, Bell, ShieldCheck, Crown][index]!;
            return (
              <article key={title} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <Icon className="h-6 w-6 text-forest" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-charcoal">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-8 rounded-lg border border-forest/20 bg-success-soft p-5">
          <h2 className="text-2xl font-bold text-charcoal">Eligibility and boundary</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Swaad Club starts as a launch waitlist/notification promise. Paid membership, priority queue ordering,
            renewal, cancellation, and invoice handling belong to the next revenue slice after backend activation.
          </p>
        </section>

        <section className="mt-8 grid gap-3">
          <h2 className="text-2xl font-bold text-charcoal">FAQs</h2>
          {faqs.map(([question, answer]) => (
            <details key={question} className="rounded-lg border border-black/10 bg-white p-4">
              <summary className="cursor-pointer font-semibold text-charcoal">{question}</summary>
              <p className="mt-2 text-sm leading-6 text-muted">{answer}</p>
            </details>
          ))}
        </section>
      </section>
    </main>
  );
}
