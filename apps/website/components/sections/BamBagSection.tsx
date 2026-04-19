import Image from 'next/image';

interface BamBagSectionProps {
  eyebrow: string;
  heading: string;
  body: string;
  callout: string;
}

export function BamBagSection({
  body,
  callout,
  eyebrow,
  heading,
}: BamBagSectionProps): React.ReactElement {
  return (
    <section className="bg-saffron-light">
      <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">{eyebrow}</p>
          <h2 className="heading-section mt-4 max-w-xl text-gray900">{heading}</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray700">{body}</p>
        </div>

        <div className="grid gap-5 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]">
          <Image
            src="/images/hero-bam-bag-v2.svg"
            alt="Illustration of a chef-curated BAM Bag"
            width={560}
            height={560}
            className="h-auto w-full rounded-2xl bg-cream p-4"
          />
          <div className="rounded-2xl border border-forest-light bg-cream p-5 text-sm leading-relaxed text-gray700">
            {callout}
          </div>
        </div>
      </div>
    </section>
  );
}
