import Image from 'next/image';

import { Reveal } from '@/components/ui/Reveal';
import { SectionIntro } from '@/components/ui/SectionIntro';

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
        <SectionIntro
          eyebrow={eyebrow}
          title={heading}
          body={body}
          className="max-w-2xl"
        />

        <Reveal
          as="div"
          className="reveal-media premium-card premium-card-hover grid gap-5 rounded-3xl bg-white p-6"
          amount={0.15}
          delayClass="reveal-delay-160"
        >
          <Image
            src="/images/hero-bam-bag-v2.svg"
            alt="Illustration of a chef-curated BAM Bag"
            width={560}
            height={560}
            className="h-auto w-full rounded-2xl bg-cream p-4 transition-transform duration-300 hover:scale-[1.01]"
          />
          <div className="rounded-2xl border border-forest-light bg-cream p-5 text-sm leading-relaxed text-gray700">
            {callout}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
