# Slice 3 Product Notes: First Drop Publishing & Consumer Discovery

Slice 3 turns approved restaurant trust into first sellable inventory without introducing payment risk.

## Product Promise

An ACTIVE Hyderabad restaurant can publish a BAM Bag drop, and consumers can discover it with the disclosures needed to decide whether it is safe and relevant.

## Included

- BAM Bag template creation in Zayka Pro.
- Published template revisions so drops preserve the disclosure shown at publish time.
- Allergen mapping using `master_allergen`.
- Dietary category, spice level, serving count, minimum menu value, holding guidance, and allergen summary.
- Drop creation with quantity, price in paise, pickup start/end, lifecycle status, and public visibility.
- Consumer discovery cards and detail pages backed by `api_public_drop_card`.
- Operator SQL checks can use `drop_id` and `available_quantity`; app code can continue using canonical `drop_drop_pk` and `computed_quantity_available`.
- Realtime read path for inventory/status updates from `drop_drop`.
- Basic restaurant operational controls: activate, pause, close.
- Template library shows whether a template is ready for drops and can publish an existing revision if a template is stuck without `active_revision_fk`.
- Template edits publish a new immutable revision for future drops; existing drops keep their original revision reference.
- Template archive is the delete-equivalent for Slice 3. Hard delete is intentionally avoided so historical drops, audits, and future orders remain explainable.
- Template library includes duplicate and created-date affordances to help restaurants manage repeated daily drops.
- Drop publishing is optimized for restaurant speed: templates carry default bag quantity, pickup start offset, and pickup duration, so staff can publish a well-defined drop with minimal edits.
- Drop creation errors must render as errors with field-level correction details, not as generic success-colored messages.

## Not Included Yet

- Inventory hold / claim reservation.
- Razorpay payment.
- Order confirmation.
- Pickup QR/OTP.
- Refunds.
- Settlement or payout.
- Swaad Club, referrals, advanced analytics, or mobile parity.

## Completion Gate

Slice 3 is complete only when:

1. An ACTIVE restaurant owner creates a template.
2. The owner publishes a scheduled or active public drop.
3. Consumer-web shows the drop using real Supabase data.
4. The drop displays dietary/allergen/pickup/price/remaining count.
5. A disabled or coming-next claim state makes it clear payment is not active yet.

## Follow-Up To Make It Fully Functional In Environments

- Apply the Slice 3 migration to each target Supabase project.
- Enable Realtime on `drop_drop`.
- Create ACTIVE restaurants and owner memberships in staging/production.
- Configure Vercel env vars for `customer.gozaika.in` and `restaurant.gozaika.in`.
- Add stable test credentials and Playwright coverage for template creation, drop publishing, and consumer discovery.
- Add a scripted `db:seed:demo:slice3` command if repeated environment rebuilds need deterministic Slice 3 data.
