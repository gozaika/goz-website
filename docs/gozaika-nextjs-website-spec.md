# goZaika Website Spec (Next.js Static-First)

## Strategy Decision

This strategy is sound.

Build a **static marketing website first** using Next.js + React, then layer in dynamic capabilities after the product data model is stable. This lowers cost, shortens time-to-launch, and gives you a credible surface to socialize with investors, restaurants, and collaborators.

## Goals for Phase 1 (Static Launch)

- establish premium brand credibility
- clearly explain the goZaika model
- capture waitlist and partner intent
- avoid fake product simulation
- keep hosting and tooling costs minimal

## Non-Goals for Phase 1

- live inventory feed
- user auth/account pages
- real-time order flow
- restaurant dashboard
- heavy backend integration

## Recommended Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS + CSS variables for tokens
- **Motion:** Framer Motion (light use for section reveals)
- **Forms:** static action to endpoint placeholder (API route or external form backend later)
- **Icons/Brand assets:** use finalized files in `icons/`
- **Analytics (optional at launch):** GA4 + Search Console
- **Hosting:** Vercel hobby tier (free to start)

## Information Architecture

### Core Pages

- `/` Home
- `/how-it-works`
- `/for-restaurants`
- `/about`
- `/faq`
- `/contact`
- `/privacy`
- `/terms`
- `/refunds`
- `/food-safety`
- `/grievance`

### Utility

- `404`
- sitemap and robots
- shared header/footer

## UX and Visual Direction

- premium but warm tone
- high readability and trust-first copy
- mobile-first layout
- restrained animation
- no dark patterns or hype-heavy fake metrics

## Component Model (Reusable)

- `AnnouncementBar`
- `Navbar`
- `HeroSection`
- `TrustPills`
- `HowItWorksSteps`
- `ValueCards`
- `RestaurantCTA`
- `WaitlistForm`
- `FAQAccordion`
- `Footer`

## Content Operating Rules

Each section must directly answer one of:

- why user should join
- why restaurant should engage
- why this model is trustworthy

If a section does not satisfy one of the three, remove it.

## Forms and Data Policy (Static-First)

At launch, forms can still submit data, but the site remains static:

- `waitlist` form -> lightweight endpoint/table
- `restaurant lead` form -> separate endpoint/table

Do not build CMS dependencies for launch pages.

## SEO Baseline

- one focused page per intent (home, how-it-works, restaurant)
- clean metadata and OG tags
- city mention where relevant (Hyderabad launch context)
- avoid generating thin SEO pages before product maturity

## Accessibility and Quality Gates

- semantic headings and landmarks
- keyboard navigation for all interactive blocks
- visible focus states
- contrast-compliant color pairs
- logo alt text and explicit icon labels

## Performance Targets

- LCP under 2.5s on mid-tier mobile
- minimal JS on static pages
- optimized SVG usage and next/image for bitmaps
- avoid autoplay videos in hero

## Deployment Plan (Low Cost)

1. build and preview locally
2. deploy to Vercel preview URL
3. review with target stakeholders
4. iterate messaging and structure
5. connect purchased domain only when ready

## Phase 2 (Post-Validation)

- add structured CMS/content model or MDX
- add dynamic city pages from source-of-truth data
- integrate real drop data when app backend is stable
- split consumer/partner journeys as product matures
