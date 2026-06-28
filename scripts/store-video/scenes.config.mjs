// Scene definitions for scripts/store-video/build-video.mjs.
//
// One entry per app. Scenes follow the spec's video story structure (§10):
// discovery -> detail -> claim -> confirmation -> pickup -> habit -> payoff
// (customer); operations -> queue -> verification -> publish -> performance ->
// control -> payoff (partner). Each scene uses a REAL native screenshot from
// store-assets/screenshots/<app>/ (no fake UI). Captions are baked into the
// frame; ffmpeg adds the Ken Burns motion + cross-dissolves.
//
// type "screen": device-framed screenshot + caption.  type "brand": logo payoff.
// dur = seconds on screen (before the 0.5s cross-dissolve overlap).

const STATUS = 96, NAV = 52;

export const VIDEOS = {
  customer: {
    tone: "warm",
    out: "gozaika-customer-preview",
    scenes: [
      { type: "screen", shot: "home.png", crop: { top: STATUS, bottom: NAV }, kicker: "Fresh today", kickerColor: "#FF6B35",
        headline: "Find today&rsquo;s BAM Bags", sub: "Chef-curated pickups near you.", dur: 4.0, zoom: "in" },
      { type: "screen", shot: "drops.png", crop: { top: STATUS, bottom: NAV },
        headline: "Fresh drops nearby", sub: "Browse by cuisine, diet, and pickup window.", dur: 3.8, zoom: "out" },
      { type: "screen", shot: "drop-detail.png", crop: { top: 300, bottom: NAV }, tone: "trust", kicker: "Know what's inside", kickerColor: "#1A5C38",
        headline: "Know before you claim", sub: "Allergens, price, and pickup &mdash; upfront.", dur: 4.0, zoom: "in" },
      { type: "screen", shot: "order.png", crop: { top: STATUS, bottom: NAV }, tone: "trust", kicker: "Confirmed",
        headline: "Order with confidence", sub: "A clear status from claim to counter.", dur: 3.8, zoom: "out" },
      { type: "screen", shot: "order.png", crop: { top: 430, bottom: NAV }, kicker: "Pickup ready", kickerColor: "#FF6B35",
        headline: "Pickup made simple", sub: "Show your SMS code at the counter.", dur: 3.8, zoom: "in" },
      { type: "screen", shot: "account.png", crop: { top: STATUS, bottom: NAV }, tone: "habit", kicker: "Food passport", kickerColor: "#D4A017",
        headline: "Build your food passport", sub: "Tier up as you discover.", dur: 3.8, zoom: "out" },
      { type: "brand", headline: "Your next favorite dish is close", cta: "Download goZaika", dur: 3.6 },
    ],
  },
  partner: {
    tone: "partner",
    out: "gozaika-partner-preview",
    scenes: [
      { type: "screen", shot: "dashboard.png", crop: { top: STATUS, bottom: NAV }, kicker: "Partner app", kickerColor: "#1A5C38",
        headline: "Run pickup with confidence", sub: "Built for restaurant counters.", dur: 4.2, zoom: "in" },
      { type: "screen", shot: "counter.png", crop: { top: STATUS, bottom: NAV },
        headline: "Today&rsquo;s orders, organized", sub: "Ready, confirmed, collected.", dur: 4.0, zoom: "out" },
      { type: "screen", shot: "verify.png", crop: { top: 600, bottom: NAV }, kicker: "Server-verified", kickerColor: "#1A5C38",
        headline: "Verify every pickup", sub: "Scan QR or enter the OTP.", dur: 4.0, zoom: "in" },
      { type: "screen", shot: "drops.png", crop: { top: STATUS, bottom: NAV },
        headline: "Publish your drops", sub: "Control availability and live inventory.", dur: 4.0, zoom: "out" },
      { type: "screen", shot: "dashboard.png", crop: { top: 470, bottom: NAV }, kicker: "Owner view", kickerColor: "#D4A017",
        headline: "See demand clearly", sub: "Sell-through and pickup, at a glance.", dur: 3.8, zoom: "in" },
      { type: "screen", shot: "more.png", crop: { top: STATUS, bottom: NAV },
        headline: "Your brand stays in control", sub: "Role-safe access for every teammate.", dur: 3.8, zoom: "out" },
      { type: "brand", brandSuffix: "Partner", headline: "Get goZaika Partner", cta: "Publish. Verify. Track.", dur: 3.6 },
    ],
  },
};
