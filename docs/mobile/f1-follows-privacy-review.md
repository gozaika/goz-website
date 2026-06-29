# F1 favorites/follows — privacy review

Scope: the favorites/follows feature (web + consumer-mobile) backed by
`consumer_saved_restaurant`. Reviewed 2026-06-28 as part of the F1 vertical.

## Data handled
- `consumer_saved_restaurant` rows: `(consumer_profile_fk, restaurant_fk, saved_at)`.
  This links a consumer identity to the restaurants they follow — it is personal data.

## Exposure decisions
1. **A consumer can only ever read or modify their own follow rows.**
   - DB: `p_consumer_saved_restaurant_self` RLS restricts `consumer_saved_restaurant`
     to `rls_is_consumer_profile(consumer_profile_fk)` (or platform users).
   - BFF/web: every operation resolves the caller's own `consumer_profile_pk`
     (from the bearer actor / web session) and scopes mutations to it. The
     service-role client is only used so the aggregate count can be computed and
     so the write is scoped server-side — it is **never** used to read another
     consumer's follow set.
2. **No follower identity is exposed to anyone — partners or other consumers.**
   - The only cross-consumer signal surfaced is the aggregate `followerCount`
     (a single integer) on the public restaurant profile. It reveals *how many*
     follow a restaurant, never *who*.
   - `GET /follows` returns only the caller's own followed-restaurant cards.
3. **Follows are not exposed in the partner apps in F1.** Surfacing a follower
   count to partners (dashboard) is a possible follow-up and would still be an
   aggregate-only number; no follower list would ever be shown.

## Consent / DPDP posture
- Following a restaurant is an explicit, user-initiated action (tap Follow). The
  schema comment notes follows feed `RESTAURANT_FOLLOWERS` drop targeting and
  new-drop notifications; any such messaging remains gated by the consumer's
  existing `consumer_notification_preference` / consent settings (Slice 10).
- Unfollow is immediate and idempotent (a hard `DELETE` of the row), giving the
  consumer direct control to withdraw.
- Follow rows are owned by the consumer and are covered by the existing account
  erasure flow (rows cascade on `consumer_profile` deletion via
  `fk_consumer_saved_restaurant_consumer ... on delete cascade`).

## Conclusion
No new PII is exposed beyond an aggregate count. Per-consumer follow data stays
self-only at both the RLS and application layers. F1 is cleared on privacy.
