const fallbackPalette = ["#1A5C38", "#194B4A", "#8A5A00", "#B4532A"] as const;

export function firstGrapheme(value: string): string {
  const normalized = value.trim().normalize("NFC");
  if (!normalized) return "?";

  const Segmenter = (Intl as unknown as {
    Segmenter?: new (locale?: string, options?: { granularity: "grapheme" }) => {
      segment(input: string): Iterable<{ segment: string }>;
    };
  }).Segmenter;
  if (Segmenter) {
    const first = new Segmenter(undefined, { granularity: "grapheme" }).segment(normalized)[Symbol.iterator]().next();
    if (!first.done) return first.value.segment.toLocaleUpperCase();
  }
  return Array.from(normalized)[0]?.toLocaleUpperCase() ?? "?";
}

export function stableFallbackColor(value: string): (typeof fallbackPalette)[number] {
  let hash = 0;
  for (const character of value.normalize("NFC")) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return fallbackPalette[hash % fallbackPalette.length] ?? fallbackPalette[0];
}
