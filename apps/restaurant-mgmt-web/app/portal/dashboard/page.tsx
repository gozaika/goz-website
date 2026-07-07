import { ActionCard, Card, DataTable, MetricHero, SellThroughBar, Sparkline, Text } from "@gozaika/ui";
import { formatBasisPoints, formatPaise, IST_TIME_ZONE, istDayKey, rateToBasisPoints } from "@gozaika/utils";
import { redirect } from "next/navigation";
import { getPortalActor } from "@/lib/portal-auth";
import { loadActiveRestaurantsForProfile, loadPortalDrops, loadPortalTemplates, loadRestaurantOpsGuardrails, loadSelectedRestaurant } from "@/lib/slice3";
import { PortalChrome } from "../portal-nav";
import { toSwitcherRestaurants } from "../switcher-data";

export default async function DashboardPage() {
  const actor = await getPortalActor();
  if (!actor) redirect("/auth/login");

  const [restaurant, memberships] = await Promise.all([
    loadSelectedRestaurant(actor.profilePk),
    loadActiveRestaurantsForProfile(actor.profilePk),
  ]);
  if (!restaurant) redirect("/portal/onboarding");

  const [templates, drops, guardrails] =
    restaurant.restaurantStatusCode === "ACTIVE"
      ? await Promise.all([loadPortalTemplates(restaurant.restaurantPk), loadPortalDrops(restaurant.restaurantPk), loadRestaurantOpsGuardrails(restaurant.restaurantPk)])
      : [[], [], null];

  const activeDrops = drops.filter((drop) => drop.statusCode === "ACTIVE").length;
  const scheduledDrops = drops.filter((drop) => drop.statusCode === "SCHEDULED").length;
  const availableBags = drops.reduce((total, drop) => total + drop.quantityAvailable, 0);
  const listedBags = drops.reduce((total, drop) => total + drop.quantityTotal, 0);
  const soldBags = drops.reduce((total, drop) => total + Math.max(0, drop.quantityTotal - drop.quantityAvailable), 0);
  const todayRevenue = drops
    .filter((drop) => istDayKey(drop.pickupStartAt) === istDayKey(new Date()))
    .reduce((total, drop) => total + Math.max(0, drop.quantityTotal - drop.quantityAvailable) * drop.pricePaise, 0);
  const sellThroughBps = rateToBasisPoints(soldBags, listedBags);
  const aov = soldBags > 0 ? Math.round(todayRevenue / Math.max(1, soldBags)) : 0;
  const nowMs = new Date().getTime();
  const nextDrop = drops
    .filter((drop) => Date.parse(drop.pickupEndAt) > nowMs)
    .sort((left, right) => Date.parse(left.pickupStartAt) - Date.parse(right.pickupStartAt))[0];
  const isActive = restaurant.restaurantStatusCode === "ACTIVE";
  const publishingPaused = isActive && guardrails != null && !guardrails.publishingEnabled;

  // Recent drops oldest→newest so the sparkline reads left-to-right in time.
  const recentDrops = drops.slice(0, 6);
  const sparkValues = [...recentDrops]
    .reverse()
    .map((drop) => Math.max(0, drop.quantityTotal - drop.quantityAvailable));

  return (
    <PortalChrome restaurantName={restaurant.restaurantName} statusCode={restaurant.restaurantStatusCode} switcherRestaurants={toSwitcherRestaurants(memberships)} selectedRestaurantPk={restaurant.restaurantPk}>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
        <MetricHero
          eyebrow="goZaika Partner"
          title={`Today at ${restaurant.restaurantName}`}
          titleAs="h1"
          value={formatPaise(todayRevenue)}
          helper="Today's revenue, estimated from visible sold quantity. No payment or settlement state is changed here."
          badgeLabel={isActive ? (publishingPaused ? "Publishing paused" : "Active") : "Activation required"}
          badgeTone={isActive ? (publishingPaused ? "warning" : "success") : "warning"}
        />

        {!isActive ? (
          <a href="/portal/onboarding" className="block">
            <ActionCard
              tone="warning"
              title="Activation required"
              detail="Complete onboarding and admin approval before creating templates or publishing drops."
              actionLabel="Continue onboarding →"
            />
          </a>
        ) : null}

        {publishingPaused ? (
          <ActionCard
            tone="warning"
            title="Publishing paused by ops"
            detail="New Limited Drops are temporarily unavailable while goZaika ops reviews this restaurant. Existing orders, finance, and reports remain read-only."
          />
        ) : null}

        <DataTable
          title="Today's numbers"
          rows={[
            { label: "Bags sold / listed", value: `${soldBags}/${listedBags}`, helper: `${availableBags} available across live history` },
            { label: "Sell-through", value: formatBasisPoints(sellThroughBps), helper: `${activeDrops} active · ${scheduledDrops} scheduled` },
            { label: "AOV", value: formatPaise(aov), helper: `${templates.length} active template records` },
          ]}
        />

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <Text variant="heading" as="h2">Sell-through by recent drop</Text>
            {sparkValues.length ? (
              <div className="mt-4">
                <Sparkline values={sparkValues} label="Bags sold across recent drops, oldest to newest" />
              </div>
            ) : null}
            <div className="mt-4 grid gap-4">
              <SellThroughBar sold={soldBags} total={listedBags} label="Overall today" />
              {recentDrops.map((drop) => {
                const sold = Math.max(0, drop.quantityTotal - drop.quantityAvailable);
                return <SellThroughBar key={drop.dropPk} sold={sold} total={drop.quantityTotal} label={drop.dropTitle} />;
              })}
              {drops.length === 0 ? <p className="text-sm text-muted">Publish a Limited Drop to see trend rows.</p> : null}
            </div>
          </Card>

          <Card className="bg-cream">
            <Text variant="heading" as="h2">Next drop</Text>
            {nextDrop ? (
              <div className="mt-3">
                <p className="font-semibold text-charcoal">{nextDrop.dropTitle}</p>
                <p className="mt-1 text-sm text-muted">{new Date(nextDrop.pickupStartAt).toLocaleString("en-IN", { timeZone: IST_TIME_ZONE })}</p>
                <p className="mt-3 text-sm font-semibold text-forest">{nextDrop.quantityAvailable}/{nextDrop.quantityTotal} bags available</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No upcoming drop. Create one when publishing is enabled.</p>
            )}
            <div className="mt-5 grid gap-2">
              <a className="inline-flex min-h-11 items-center justify-center rounded-lg bg-saffron px-4 text-sm font-semibold text-charcoal shadow-sm transition hover:opacity-90" href="/portal/drops/new">Create drop</a>
              <a className="inline-flex min-h-11 items-center justify-center rounded-lg border border-forest/25 px-4 text-sm font-semibold text-forest transition hover:bg-forest/5" href="/portal/drops">View drop list</a>
            </div>
          </Card>
        </section>

        {isActive && !publishingPaused ? (
          <section className="grid gap-4 md:grid-cols-2">
            <a href="/portal/templates" className="block">
              <ActionCard
                title="Create BAM Bag template"
                detail="Add reusable dietary, allergen, serving, holding, and pricing disclosures."
                actionLabel="Open templates →"
              />
            </a>
            <a href="/portal/drops/new" className="block">
              <ActionCard
                title="Publish a drop"
                detail="Choose a template, set quantity and pickup window, then publish to consumer discovery."
                actionLabel="Create drop →"
              />
            </a>
          </section>
        ) : null}
      </section>
    </PortalChrome>
  );
}
