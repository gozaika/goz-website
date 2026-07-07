import { Card, palette, spacing, Text } from "@gozaika/mobile-ui";
import { View } from "react-native";
import type { PickupProofDto } from "@/api/orders";

/**
 * In-app pickup proof (CM-2) — parity with the web order detail. Renders the same
 * QR-style block + the 6-digit OTP so the customer can complete pickup from the app
 * instead of depending on the SMS channel. The OTP is the verifiable credential;
 * the grid is a visual proof (goZaika stores only hashes). Rendered with plain RN
 * Views so no native QR/SVG dependency (and no native rebuild) is required.
 */

const GRID = 29;
const CELL = 6;

// Deterministic, dependency-free cell fill (decorative — the OTP is the real
// credential). Mirrors the web card's finder-marker layout + pseudo-random field.
function hashInt(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function qrCells(payload: string): boolean[] {
  return Array.from({ length: GRID * GRID }, (_, index) => {
    const row = Math.floor(index / GRID);
    const col = index % GRID;
    const inMarker = (row < 7 && col < 7) || (row < 7 && col >= 22) || (row >= 22 && col < 7);
    const inMarkerCenter =
      (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
      (row >= 2 && row <= 4 && col >= 24 && col <= 26) ||
      (row >= 24 && row <= 26 && col >= 2 && col <= 4);
    const inMarkerGap =
      (row === 1 && col < 7) ||
      (col === 1 && row < 7) ||
      (row === 1 && col >= 22) ||
      (col === 27 && row < 7) ||
      (row === 27 && col < 7) ||
      (col === 1 && row >= 22);
    if (inMarkerCenter) return true;
    if (inMarker || inMarkerGap) return !inMarkerGap;
    return (hashInt(`${payload}:${index}`) + row + col) % 3 !== 0;
  });
}

export function PickupProofCard({ proof }: { readonly proof: PickupProofDto }) {
  const cells = qrCells(proof.qrPayload);
  const rows = Array.from({ length: GRID }, (_, r) => cells.slice(r * GRID, r * GRID + GRID));

  return (
    <Card elevated="sm">
      <Text variant="heading">Show your pickup code</Text>
      <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "center", marginTop: spacing.sm }}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Pickup QR proof"
          style={{ backgroundColor: palette.white, padding: 6, borderRadius: 8, borderWidth: 1, borderColor: palette.border }}
        >
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: "row" }}>
              {row.map((filled, c) => (
                <View key={c} style={{ width: CELL, height: CELL, backgroundColor: filled ? palette.charcoal : palette.white }} />
              ))}
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="caption" color={palette.muted}>
            OTP
          </Text>
          <Text variant="title" color={palette.charcoal} style={{ letterSpacing: 4 }}>
            {proof.otp}
          </Text>
        </View>
      </View>
      <Text variant="caption" color={palette.muted} style={{ marginTop: spacing.sm }}>
        Show this at the counter during your pickup window. The QR nonce and OTP are for you only — goZaika stores hashes for
        verification. Issued {new Date(proof.issuedAt).toLocaleString("en-IN")}.
      </Text>
    </Card>
  );
}
