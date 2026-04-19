# Domain Migration Checklist: gozaika.in

## DNS records

- [ ] Add apex A record and `www` CNAME values provided by Vercel.
- [ ] Wait for DNS propagation and verify with public DNS lookup.

## Vercel domain mapping

- [ ] Add `gozaika.in` and `www.gozaika.in` to project domains.
- [ ] Set primary domain and redirect non-primary host.

## SSL verification

- [ ] Confirm certificate status is `Valid` in Vercel.
- [ ] Validate HTTPS on both apex and `www`.

## Analytics and search

- [ ] Update GA4 stream URL to `https://gozaika.in`.
- [ ] Add new Search Console property for `https://gozaika.in`.
- [ ] Submit fresh sitemap URL `https://gozaika.in/sitemap.xml`.

## Email and sender setup

- [ ] Configure domain in Resend and verify SPF/DKIM.
- [ ] Update `RESEND_FROM_EMAIL` to a verified domain sender.
- [ ] Confirm mailbox aliases (`hello`, `waitlist`, `partners`, `privacy`, `refund`, `safety`, `grievance`) resolve correctly.

## Supabase and CORS

- [ ] Add `https://gozaika.in` and `https://www.gozaika.in` to allowed origins.
- [ ] Re-test API route inserts from production domain.

## Canonical and base URL

- [ ] Update `NEXT_PUBLIC_BASE_URL` to `https://gozaika.in`.
- [ ] Rebuild and verify canonical tags across all pages.

## Robots and sitemap recrawl

- [ ] Verify `robots.txt` points to new sitemap.
- [ ] Request recrawl in Search Console for homepage and key routes.
