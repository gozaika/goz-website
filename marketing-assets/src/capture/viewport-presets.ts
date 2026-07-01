export type ViewportPreset = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
};

export const viewportPresets = [
  { id: "desktop-wide", width: 1440, height: 1200, deviceScaleFactor: 1 },
  { id: "desktop-store", width: 1290, height: 2796, deviceScaleFactor: 1 },
  { id: "tablet-portrait", width: 1024, height: 1366, deviceScaleFactor: 1 },
  { id: "mobile-web", width: 390, height: 844, deviceScaleFactor: 2 },
  { id: "android-portrait", width: 1080, height: 2400, deviceScaleFactor: 1 },
  { id: "android-tablet", width: 1600, height: 2560, deviceScaleFactor: 1 },
] as const satisfies readonly ViewportPreset[];

export function getViewportPreset(id: string): ViewportPreset {
  const preset = viewportPresets.find((candidate) => candidate.id === id);
  if (!preset) {
    throw new Error(`Unknown viewport preset "${id}". Known presets: ${viewportPresets.map((item) => item.id).join(", ")}`);
  }
  return preset;
}
