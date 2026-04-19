/**
 * @file apps/website/lib/sanitize.ts
 * @description Input sanitisation helpers for public form submissions.
 */

/**
 * Strips markup/control characters, trims whitespace, and applies max length.
 *
 * @param value - Untrusted input value.
 * @param maxLength - Maximum allowed output length.
 * @returns Sanitised string safe for persistence and notifications.
 */
export function sanitize(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .slice(0, maxLength);
}
