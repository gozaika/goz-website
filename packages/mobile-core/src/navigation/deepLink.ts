/**
 * Deep-link safety (Slice 17 threat model: "malicious payload/link"). A push
 * notification's `data.link` is attacker-influenceable, so it must never be
 * handed to the router verbatim. Only an in-app, absolute, single-slash path is
 * allowed to navigate; anything else (an external URL, a protocol-relative
 * "//host", a custom scheme, a backslash, or a control char) is rejected.
 */

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/** True if the string contains any control char (U+0000-U+001F or U+007F). */
function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

/**
 * Return a safe in-app navigation path, or null if the input is not a trusted
 * internal route. Pure + RN-free so it is unit-testable and reused by both apps.
 */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const link = value.trim();
  if (link.length === 0 || link.length > 512) return null;
  // Must be an app-absolute path.
  if (!link.startsWith("/")) return null;
  // Reject protocol-relative ("//host") and Windows-style separators.
  if (link.startsWith("//") || link.includes("\\")) return null;
  // Reject control chars and anything carrying a scheme (e.g. "javascript:", "http:").
  if (hasControlChar(link)) return null;
  if (SCHEME.test(link.slice(1))) return null;
  return link;
}
