# Web Capture Auth Notes

Status: Slice 2 capture lane.

The web capture runner does not create demo users, bypass auth, or fabricate partner state. Start the
target app normally, sign in through the browser or a trusted Playwright setup, and save a storage
state JSON under ignored local workspace paths such as:

```text
marketing-assets/auth/restaurant-web.storage.json
```

Use it with:

```bash
npm run assets:capture:web -- --app restaurant-web --storage-state marketing-assets/auth/restaurant-web.storage.json
```

Rules:

- Customer public routes may capture without auth only when the page is genuinely public.
- Partner `/portal/*` routes require authenticated state.
- Raw screenshots remain ignored under `marketing-assets/captures/raw/`.
- Do not commit cookies, tokens, local storage, OTPs, QR payloads, phone numbers, or private order
  proof.
- If the app redirects to auth or the target state is empty, record the blocker instead of replacing
  it with fake UI.
