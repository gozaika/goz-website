import type { Page } from "@playwright/test";

// Shared authed-spec helper for consumer-web Playwright flows (Phase 5).
// Logs in via the primary phone-OTP path against live cloud demo data using the
// seeded test OTPs (owner enabled test phone numbers on remote). Not a `.spec`
// file, so Playwright does not run it as a test.
//
// Demo consumers (supabase/seed_demo/README.md):
//   Rahul — VEG dietary preference (drives the §16 allergen gate). +919876510002 / OTP 100002.
//   Priya — no dietary/allergen prefs.                             +919876510001 / OTP 100001.

export const RAHUL = { phone: "+919876510002", otp: "100002" } as const;
export const PRIYA = { phone: "+919876510001", otp: "100001" } as const;

/**
 * Sign a demo consumer in via phone OTP. Returns true when the session is
 * established (URL left /auth/login), false if the environment rejected the OTP
 * (e.g. test phone numbers not enabled) — callers should `test.skip` on false so
 * the opt-in gate stays honest rather than hard-failing on a mis-seeded env.
 */
export async function loginByPhoneOtp(page: Page, creds: { phone: string; otp: string } = RAHUL): Promise<boolean> {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });

  await page.getByLabel(/mobile number/i).fill(creds.phone);
  await page.getByRole("button", { name: /send otp/i }).click();

  const otpField = page.getByLabel(/6-digit otp/i);
  await otpField.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  if (!(await otpField.isVisible().catch(() => false))) {
    return false; // send-OTP failed (network / provider) — surface as skip, not failure.
  }
  await otpField.fill(creds.otp);
  await page.getByRole("button", { name: /verify and continue/i }).click();

  // finishAuth() routes to /account (or /onboarding/consent). Either means the
  // Supabase session cookie is set. Race the success redirect against a visible
  // auth error so a rejected OTP resolves quickly instead of hanging.
  const outcome = await Promise.race([
    page.waitForURL(/\/(account|onboarding)/, { timeout: 30_000 }).then(() => "ok" as const).catch(() => "timeout" as const),
    page
      .locator("p.text-red-700")
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "error" as const)
      .catch(() => "timeout" as const),
  ]);

  return outcome === "ok" && !page.url().includes("/auth/login");
}
