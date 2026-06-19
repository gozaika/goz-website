/**
 * Idempotency-key helper. Non-idempotent mutations (claim, checkout, pickup verify)
 * must send a stable key so retries with the same key are de-duplicated server-side
 * (shared spec §6). Uses the platform crypto UUID when available with a safe fallback.
 */
export function newIdempotencyKey(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }
  // RFC4122-ish v4 fallback for runtimes without crypto.randomUUID (older Hermes).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** True when a string is a syntactically valid UUID (any version). */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
