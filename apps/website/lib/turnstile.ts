/**
 * @file apps/website/lib/turnstile.ts
 * @description Cloudflare Turnstile token verification helper for API routes.
 */

interface TurnstileResponse {
  readonly success: boolean;
}

/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * @param token - Token received from Turnstile widget on the client.
 * @returns True when Cloudflare confirms a valid human verification token.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    return false;
  }

  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    },
  );

  const data = (await res.json()) as TurnstileResponse;
  return data.success;
}
