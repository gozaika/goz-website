/**
 * Redaction for logs/crash breadcrumbs. Strips secrets and PII before anything
 * leaves the device (shared spec §9): Authorization, tokens, phone/email, OTP,
 * QR nonce, document URLs and precise coordinates.
 */
const REDACTED = "[redacted]";

const SENSITIVE_KEY_PATTERN =
  /(authorization|access[_-]?token|refresh[_-]?token|^token$|password|otp|qr|nonce|credential|secret|signature|phone|email|latitude|longitude|signed[_-]?url|document[_-]?url)/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

/**
 * Deep-clone a value, replacing the values of sensitive keys with "[redacted]".
 * Bounded recursion depth to avoid pathological/cyclic payloads.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redact(val, depth + 1);
  }
  return out;
}
