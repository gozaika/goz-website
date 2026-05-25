# Slice 5 Product Notes: Pickup Verification, Incident Basics & Pilot UX Polish

Slice 5 closes the paid pickup loop for the Hyderabad pilot without adding refunds, settlements, notifications, or native mobile work. Slice 6 later adds transactional notification outbox support as a non-blocking side effect.

## Consumer Behavior

- Paid orders show pickup QR/OTP only while the order is still pickup-eligible.
- After `COLLECTED`, the order detail and account history show collected state and collection time when available.
- After `NO_SHOW`, the order detail explains the pickup was missed and does not promise an automatic refund.
- `/drops` shows current/latest drops first. Closed pickup windows move to `What you missed`.
- `/account` keeps active holds prominent and moves expired, released, or converted holds into history.

## Restaurant Behavior

- `/portal/orders` is a counter workflow for paid pickup orders belonging to the active restaurant only.
- Staff enter a 6-digit OTP first; QR payload paste is supported through the same server verification path.
- Successful verification marks the order `COLLECTED`, records a pickup verification event, appends an order transition, and writes a `PICKUP_COLLECTED` inventory event.
- Replays, refreshes, and repeated clicks cannot create duplicate collection transitions.
- Invalid code, wrong restaurant, already collected, expired window, and not-ready states return clear messages.
- After the pickup window closes, staff can mark an uncollected eligible order `NO_SHOW` with a reason. No refund is created.
- Staff can log short incidents for `DIETARY_MISMATCH`, `FOOD_SAFETY`, `PACKAGING_BREACH`, `PICKUP_NOT_HONORED`, `MISSING_ORDER`, `QUALITY_ISSUE`, and `PLATFORM_ERROR`.

## Admin Behavior

- `/admin/drops` groups active drops, closed/missed drops, claim holds, payment/order state, pickup attempts, incidents, and webhook ledger state.
- Admin can create minimal order-linked incidents from pickup support context.
- Admin views remain support-safe: no raw OTP, QR nonce, hashes, raw payment payloads, private documents, or direct consumer contact fields.

## Compliance And Safety

- Food safety and dietary mismatch incidents are escalation-sensitive and should use `P1` or `P2` when there is any real safety risk.
- Pickup verification proves collection only. It never proves payment and never creates orders, payments, refunds, settlements, payouts, or compensation.
- Razorpay payment ownership remains the verified webhook path from Slice 4B.

## Pilot UX Polish

- Restaurant drop publishing now uses a stable mobile-first form and an independently scrollable recent-drop panel on desktop.
- Consumer drop discovery keeps actionable drops separate from closed windows.
- Consumer account separates active holds from stale hold history.
- Website/footer/legal/contact copy uses the approved goZaika mailboxes.
