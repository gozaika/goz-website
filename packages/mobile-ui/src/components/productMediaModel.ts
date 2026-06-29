// Pure decision logic for ProductMedia, extracted so the fallback contract is
// lockable by a unit test (the component file itself needs a React renderer).
//
// The contract (product-media gate #5): a real uploaded image renders, but a
// missing OR failed remote image must transparently fall back to the local
// semantic art — never a broken-image glyph, never a height change.

export interface ProductMediaModelInput {
  /** Resolved remote asset (already trust-boundary-filtered by the read model). */
  readonly url?: string | null;
  readonly alt?: string | null;
  /** True once the remote <Image> has reported an onError. */
  readonly failed?: boolean;
  /** Caller-supplied label; wins over the asset's alt text. */
  readonly accessibilityLabel?: string | null;
}

export interface ProductMediaModel {
  /** Trimmed remote uri, or null when there is nothing usable to render. */
  readonly uri: string | null;
  /** When true, render the remote uri; when false, render the local fallback. */
  readonly showRemote: boolean;
  /** Accessibility label to apply only when the remote image is shown. */
  readonly label: string | undefined;
}

/**
 * Decide whether to show the remote image or the local fallback. A blank/whitespace
 * url, a null url, or a previously-failed load all resolve to the fallback.
 */
export function resolveProductMedia({
  url,
  alt,
  failed = false,
  accessibilityLabel,
}: ProductMediaModelInput): ProductMediaModel {
  const uri = url?.trim() || null;
  const showRemote = Boolean(uri && !failed);
  const label = (accessibilityLabel ?? alt) || undefined;
  return { uri, showRemote, label: showRemote ? label : undefined };
}
