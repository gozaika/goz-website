import { ChefHat, MapPin, ShieldCheck } from 'lucide-react';

interface TrustBadge {
  title: string;
  subtitle: string;
}

interface TrustBadgesSectionProps {
  badges: ReadonlyArray<TrustBadge>;
}

const iconMap = [ChefHat, ShieldCheck, MapPin] as const;

export function TrustBadgesSection({
  badges,
}: TrustBadgesSectionProps): React.ReactElement {
  return (
    <section className="bg-forest py-8">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {badges.map((badge, index) => {
            const Icon = iconMap[index] ?? ChefHat;

            return (
              <div
                key={badge.title}
                className="premium-card premium-card-hover flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 p-4 backdrop-blur-sm"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-saffron">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{badge.title}</p>
                  <p className="text-xs text-forest-light">{badge.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
