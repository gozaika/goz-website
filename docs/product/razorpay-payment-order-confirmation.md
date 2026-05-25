# Slice 4B Product Notes: Razorpay Payment & Order Confirmation

Slice 4B turns a temporary BAM Bag hold into a paid, confirmed pickup order.

## Consumer Behavior

- A signed-in consumer creates an active hold from a public drop.
- `/checkout/{holdPk}` shows the held bag, pickup window, quantity, price, dietary category, and allergen disclosures.
- `Proceed to payment` creates or reuses a server-side Razorpay order, then opens Checkout.js.
- The UI shows payment pending after Checkout.js returns. It does not claim success until server status shows a webhook-confirmed paid order.
- `/orders/{orderPk}` shows the order number, restaurant, bag title, dietary/allergen disclosures, pickup window, paid amount, quantity, pickup instructions, QR-style proof, and 6-digit OTP fallback.

## Restaurant Behavior

- `/portal/orders` lists current `PAID`, `CONFIRMED`, and `READY_FOR_PICKUP` orders for the restaurant.
- Staff can see order number, pickup window, quantity, amount, order/payment status, dietary category, and allergen context.
- Staff cannot mark collected, trigger refunds, override payments, or create consumer payments in this slice.

## Admin/Ops Behavior

- `/admin/drops` keeps launch comms and hold support.
- The page also shows recent payment intents and webhook processing state.
- Admin can answer whether a Razorpay order was created, whether a hold converted, whether the webhook arrived, and whether an order exists.
- Raw provider payloads, provider secrets, pickup credential hashes, private compliance docs, and full consumer PII are not exposed.

## Security And Compliance

- Razorpay order creation uses server-side `RAZORPAY_KEY_SECRET`.
- Browser receives only `NEXT_PUBLIC_RAZORPAY_KEY_ID`, amount, currency, Razorpay order id, and safe display fields.
- Verified Razorpay webhooks are the only path that marks payment captured and creates confirmed orders.
- Webhook replay is idempotent by provider event id, provider payment id, and existing hold/order links.
- Pickup proof stores only hashed QR nonce and OTP. Raw values are generated for the authenticated order owner and never stored in plaintext.
- Dietary and allergen disclosures remain visible at checkout, account history, order confirmation, restaurant order queue, and admin support surfaces.

## Not Included

Refunds, settlements, payouts, invoices, reconciliation exports, subscriptions, referrals, campaign management, and native mobile parity remain out of scope for the payment slice. Slice 5 adds pickup verification/incidents, and Slice 6 adds post-conversion WhatsApp/email outbox notifications without changing payment ownership.
