import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { SectionIntro } from '@/components/ui/SectionIntro';

interface HomeWaitlistSectionProps {
  heading: string;
  body: string;
  foundingOffer: string;
  teaser: string;
  disclaimer: string;
}

export function HomeWaitlistSection({
  body,
  disclaimer,
  foundingOffer,
  heading,
  teaser,
}: HomeWaitlistSectionProps): React.ReactElement {
  return (
    <section id="waitlist" className="bg-cream py-24">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <SectionIntro title={heading} body={body} centered className="mx-auto max-w-2xl" />
        <p className="mx-auto mt-4 inline-flex items-center rounded-full border border-saffron bg-saffron-light px-4 py-1.5 text-sm font-medium text-forest">
          {foundingOffer}
        </p>

        <div className="mt-12 rounded-3xl border border-dashed border-saffron bg-saffron-light/30 p-8 text-center">
          <p className="mx-auto max-w-2xl text-lg italic leading-relaxed text-gray700">{teaser}</p>
        </div>

        <p className="mt-6 text-center text-xs text-gray500">
          {disclaimer}
        </p>

        <div className="premium-card mx-auto mt-12 max-w-2xl rounded-2xl bg-white p-8 backdrop-blur-sm sm:p-12">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
