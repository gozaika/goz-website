import { createContext, useContext } from "react";

/**
 * The floating PeekBar (active holds / pickup reminder) is absolutely positioned
 * above the tab bar, so it overlaps the bottom of scroll content and sticky action
 * bars (CM-3). The tabs layout publishes the height to reserve — the PeekBar's
 * footprint when one is showing, else 0 — and screens add it to their bottom
 * padding (or lift their sticky bar) so nothing is occluded.
 */
export const PEEK_BAR_SLOT = 76;

const PeekBarInsetContext = createContext(0);

export const PeekBarInsetProvider = PeekBarInsetContext.Provider;

/** Bottom inset (px) to reserve for the floating PeekBar; 0 when none is visible. */
export function usePeekBarInset(): number {
  return useContext(PeekBarInsetContext);
}
