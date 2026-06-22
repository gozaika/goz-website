# Mobile identity and fallback QA

Result: PASS (39/39 checks passed)

| Check | Status | Evidence |
|---|---:|---|
| consumer-mobile/icon.png dimensions | PASS | 2048 x 2048 |
| consumer-mobile/icon.png alpha contract | PASS | fully opaque |
| consumer-mobile/adaptive-icon.png dimensions | PASS | 2048 x 2048 |
| consumer-mobile/adaptive-icon.png alpha contract | PASS | transparent pixels present |
| consumer-mobile/splash-icon.png dimensions | PASS | 2048 x 2048 |
| consumer-mobile/splash-icon.png alpha contract | PASS | transparent pixels present |
| consumer-mobile/notification-icon.png dimensions | PASS | 96 x 96 |
| consumer-mobile/notification-icon.png alpha contract | PASS | transparent pixels present |
| consumer-mobile/monochrome-icon.png dimensions | PASS | 2048 x 2048 |
| consumer-mobile/monochrome-icon.png alpha contract | PASS | transparent pixels present |
| consumer-mobile/drop-default.png dimensions | PASS | 1200 x 900 |
| consumer-mobile/drop-default.png alpha contract | PASS | fully opaque |
| consumer-mobile/restaurant-cover-default.png dimensions | PASS | 1600 x 900 |
| consumer-mobile/restaurant-cover-default.png alpha contract | PASS | fully opaque |
| consumer-mobile adaptive monochrome config | PASS | ./assets/monochrome-icon.png |
| consumer-mobile adaptive background | PASS | #FFF8F0 |
| consumer-mobile splash background | PASS | #FFF8F0 |
| restaurant-mobile/icon.png dimensions | PASS | 2048 x 2048 |
| restaurant-mobile/icon.png alpha contract | PASS | fully opaque |
| restaurant-mobile/adaptive-icon.png dimensions | PASS | 2048 x 2048 |
| restaurant-mobile/adaptive-icon.png alpha contract | PASS | transparent pixels present |
| restaurant-mobile/splash-icon.png dimensions | PASS | 2048 x 2048 |
| restaurant-mobile/splash-icon.png alpha contract | PASS | transparent pixels present |
| restaurant-mobile/notification-icon.png dimensions | PASS | 96 x 96 |
| restaurant-mobile/notification-icon.png alpha contract | PASS | transparent pixels present |
| restaurant-mobile/monochrome-icon.png dimensions | PASS | 2048 x 2048 |
| restaurant-mobile/monochrome-icon.png alpha contract | PASS | transparent pixels present |
| restaurant-mobile/drop-default.png dimensions | PASS | 1200 x 900 |
| restaurant-mobile/drop-default.png alpha contract | PASS | fully opaque |
| restaurant-mobile/restaurant-cover-default.png dimensions | PASS | 1600 x 900 |
| restaurant-mobile/restaurant-cover-default.png alpha contract | PASS | fully opaque |
| restaurant-mobile adaptive monochrome config | PASS | ./assets/monochrome-icon.png |
| restaurant-mobile adaptive background | PASS | #1A5C38 |
| restaurant-mobile splash background | PASS | #1A5C38 |
| Customer and partner launchers are distinct | PASS | different SHA-256 hashes |
| Fallback drop is consistent across apps | PASS | same approved fallback master |
| Fallback restaurant cover is consistent across apps | PASS | same approved fallback master |
| consumer Expo export | PASS | metadata plus android and ios bundles |
| partner Expo export | PASS | metadata plus android and ios bundles |

The targeted discovery contract tests, fallback utility tests, shared UI typecheck, customer-mobile typecheck, restaurant-mobile typecheck, and both Expo public-config resolutions were run separately and passed on 2026-06-22.
