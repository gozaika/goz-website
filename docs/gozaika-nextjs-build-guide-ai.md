# goZaika Next.js Build + Deploy Guide (AI-Assisted)

## Objective

Ship a high-finesse static marketing website quickly, with low upfront cost, using:

- Cursor (editor + orchestration)
- Codex (implementation and refactors)
- Claude (copy polishing and UX critique)

## Cost-Minimizing Principles

- build locally first
- use free tiers for tooling/hosting
- postpone domain purchase until messaging and structure are validated
- avoid paid CMS before dynamic model is real

## Tool Roles

### Cursor

- source-of-truth workspace
- run prompts, inspect diffs, approve edits
- run local dev and deployment commands

### Codex

- scaffold and implement Next.js code
- create reusable components and page structure
- enforce consistency in tokens, SEO metadata, and accessibility

### Claude

- sharpen copy clarity
- improve tone and persuasion for investor/restaurant audiences
- critique narrative flow and CTA strength

## Step-by-Step Build Plan

### 1) Project Bootstrap

1. Create app:
   - `npx create-next-app@latest gozaika-web --typescript --eslint --app --src-dir --tailwind`
2. Add preferred formatter/lint config.
3. Create folder structure:
   - `src/app/(marketing)/...`
   - `src/components/marketing`
   - `src/content`
   - `public/icons`

### 2) Bring in Brand Assets

1. Copy finalized assets from `icons/` into `public/icons`.
2. Configure:
   - navbar logo: `gozaika-logo-horizontal.svg`
   - dark sections: `gozaika-logo-white.svg`
   - favicon: `favicon.ico`
   - apple icon: `apple-touch-icon-180.png`

### 3) Create Design Tokens

Define CSS variables in global styles:

- `--color-saffron: #FF6B35`
- `--color-forest: #1A5C38`
- `--color-cream: #FFF8EF` (recommended neutral)
- `--color-charcoal: #2B2B2B`

Set typography scale and spacing tokens before building components.

### 4) Build Reusable Sections

Implement once, compose across pages:

- `HeroSection`
- `TrustPills`
- `HowItWorksSteps`
- `ValueCards`
- `RestaurantCTA`
- `WaitlistForm`
- `FAQAccordion`
- `SiteFooter`

### 5) Add Static Content Source

Use local typed content constants in `src/content/marketing.ts`.

This gives structure now and allows clean migration to CMS/API later.

### 6) Build Core Pages

Create all launch routes from the spec:

- home
- how-it-works
- for-restaurants
- about
- faq
- contact
- legal pages

### 7) Forms (Static-First)

Short-term options:

- Formspree / Tally / Google Form bridge (fastest)
- or Next.js route handlers writing to a lightweight store

Keep UI and validation identical regardless of backend.

### 8) SEO + Metadata

Add per-page metadata:

- title
- description
- canonical
- OG/Twitter image

Also add sitemap and robots.

### 9) QA Checklist

- mobile and desktop responsive pass
- lighthouse pass baseline
- keyboard nav + focus visibility pass
- form validation and success state pass
- all logo variants displayed correctly on target backgrounds

### 10) Deploy on Free Tier

1. Push repo to GitHub.
2. Connect Vercel project.
3. Deploy preview and production on Vercel free tier.
4. Share preview URL for socialization before domain purchase.

## Suggested AI Prompt Flow

### Prompts for Codex in Cursor

- `Create a Next.js App Router marketing site skeleton with routes for home, how-it-works, for-restaurants, about, faq, contact, and legal pages.`
- `Implement reusable marketing components with Tailwind and responsive behavior.`
- `Integrate provided logo assets and set favicon/apple touch icon in metadata.`
- `Refactor page copy into typed content constants and wire all pages to that source.`

### Prompts for Claude

- `Rewrite this hero copy for premium tone with concise CTA clarity; keep claims realistic and trust-first.`
- `Review this page for investor readability and restaurant conversion concerns; suggest improvements only where clarity is weak.`

## Branching and Workflow

- `main`: stable
- `feat/static-marketing-v1`: active build
- merge only after content and visual QA pass

## When to Buy Domain

Buy domain only when:

- narrative is validated with early stakeholders
- pages are complete and polished
- forms reliably capture leads
- legal pages are ready for public visibility

Until then, use Vercel preview/production subdomain to minimize cost.

## Phase 2 Upgrade Path

When ready for dynamic features:

- move content constants to a structured schema
- introduce CMS or API-backed content fetch
- add city and partner data-driven pages
- integrate app/partner subdomains progressively
