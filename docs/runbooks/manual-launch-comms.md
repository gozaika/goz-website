# Manual Launch Comms Runbook

Slice 3.5 supports Hyderabad pilot promotion without notification automation. Operators and restaurant staff copy public drop links and WhatsApp-ready text manually.

## What This Does

- Uses the existing safe public discovery view, `api_public_drop_card`.
- Generates copy through `generateManualDropAlertText` in `@gozaika/utils`.
- Uses stable consumer links in the form `https://customer.gozaika.in/drops/{dropPk}`.
- Shows copy controls in consumer drop detail/list, restaurant recent drops and publish success, and admin `/admin/drops`.

## What This Does Not Do

- No WATI integration.
- No notification outbox processing.
- No scheduled/background sends.
- No campaign manager.
- No payment, claim hold, order, QR, refund, or settlement logic.

## Restaurant Smoke Test

1. Sign in to `https://restaurant.gozaika.in/` as an approved restaurant user.
2. Create or use an active BAM Bag template.
3. Publish an `ACTIVE` or `SCHEDULED` drop.
4. In the publish success state, click `Copy link`.
5. Click `Copy alert`.
6. Open the copied link in a private/incognito browser.
7. Confirm the link opens the public consumer drop detail page.
8. Confirm the alert includes restaurant, drop, pickup window, price, availability, dietary category, allergens, pickup context, and URL.

## Consumer Smoke Test

1. Open the copied drop URL on `https://customer.gozaika.in/`.
2. Confirm restaurant, title, dietary category, allergens, price, pickup window, and available quantity render clearly.
3. Confirm claim holds are available only for eligible active/scheduled drops and still say payment is not charged yet.
4. Use `Copy link` or native `Share` on the drop detail page.

## Admin Smoke Test

1. Sign in to `https://admin.gozaika.in/` as an admin/operator.
2. Open `/admin/drops`.
3. Find the active or scheduled drop.
4. Copy the public link and alert message.
5. Confirm the alert matches the restaurant-generated version for the same public fields.

## Safety Checks

- Paused, closed, cancelled, and non-public drops should not appear in `/admin/drops` or the restaurant public-sharing panel.
- If the formatter receives a sold-out or unavailable drop, it says `Not available to claim right now`.
- Alerts include `Check allergens before claiming.` when allergen data exists.
- Alerts do not say WhatsApp messages are sent automatically.
- Alerts do not promise specific contents beyond the stored drop/title/template data.

## Remote Deployment Notes

- No Supabase migration is required for Slice 3.5.
- No new Vercel environment variables are required.
- Redeploy `customer.gozaika.in`, `restaurant.gozaika.in`, and `admin.gozaika.in`.
- Realtime settings do not change.
- Seed/demo data refresh is not required if at least one public active or scheduled drop already exists.
