# Slice 6 Product Notes: Transactional Notifications & Delivery Logs

Slice 6 adds a durable notification outbox for pilot-critical transactional messages after the paid pickup loop is already valid.

## Consumer Behavior

- Verified Razorpay webhook conversion enqueues order confirmation messages for the customer.
- Pickup reminder cron enqueues one reminder per eligible paid, uncollected order as the pickup window approaches.
- `/orders/{orderPk}` and `/account` show calm message states such as sent, queued, delivery unavailable, unavailable by consent, or destination missing.
- Notification failures never block payment confirmation, pickup proof, pickup verification, no-show, or incident flows.

## Restaurant Behavior

- New paid order alerts are enqueued for configured restaurant operational contacts.
- `/portal/orders` keeps the counter workflow primary and adds compact notification history for the restaurant's own orders.
- Staff can continue verifying pickup even when WhatsApp or email providers are unavailable.

## Admin Behavior

- `/admin/notifications` shows support-safe delivery logs: queued, sent, failed, suppressed, cancelled, retry count, provider reference, masked destination, scheduled time, last attempt, and fallback copy.
- Admin can retry eligible failed notifications and suppress queued/retryable notifications with an audited reason.
- Admin can copy safe manual fallback text. The copy is a fallback aid, not proof of provider delivery.

## Consent And Preference Handling

- WhatsApp transactional sends require latest `WHATSAPP_TRANSACTIONAL` consent plus enabled WhatsApp channel preference.
- Email operational sends require latest `OPERATIONAL` consent plus enabled email preference where a preference row exists.
- Missing consent, disabled preference, or missing destination creates a `SUPPRESSED` support-visible row instead of silently disappearing.
- Marketing purposes are not used in this slice.

## Provider And Dry Run Behavior

- WhatsApp delivery defaults to Meta Cloud API so the pilot can use Meta's native sandbox/test number for development and early traction testing.
- WATI remains a selectable provider for a later scale-up phase by setting `NOTIFICATION_WHATSAPP_PROVIDER=WATI` and configuring WATI env vars.
- Email delivery uses Resend only when Resend env vars are configured.
- `NOTIFICATION_DRY_RUN=true` records successful dry-run attempts without contacting Meta, WATI, or Resend.
- Missing provider configuration records `PROVIDER_NOT_CONFIGURED` and leaves a manual fallback path.
- Meta sandbox testing still requires real tester-owned WhatsApp recipient accounts added to the Meta test recipient allowlist. Fake or non-WhatsApp phone numbers cannot receive WhatsApp messages.

## Not Included

Native push, Expo token registration, marketing campaigns, bulk broadcasts, referrals, loyalty, refunds, settlements, payouts, finance dashboards, and destructive order corrections remain out of scope.
