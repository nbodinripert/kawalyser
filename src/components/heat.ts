/**
 * The heat colors of globals.css, from the least typed key to the most typed one: blues, from navy to electric blue,
 * then cyan and turquoise, ending on a bright mint glow in the dark theme (from pale to deep in the light one).
 * The hues stay in the blues but are spread wide, so that keys typed a little differently still look different
 * (Kawamashi's feedback on dull keys). They are mixed in OKLCH, which keeps the colors bright between two stops.
 */
const heatStops = ["var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"] as const;

/** The color of a key typed with the given heat, from 0 (least typed) to 1 (most typed). */
export function heatColor(heat: number): string {
  const segments = heatStops.length - 1;
  const level = Math.min(1, Math.max(0, heat)) * segments;
  const index = Math.min(Math.floor(level), segments - 1);
  const towardNext = Math.round((level - index) * 100);
  return `color-mix(in oklch, ${heatStops[index + 1] ?? ""} ${towardNext}%, ${heatStops[index] ?? ""})`;
}

/** The whole scale, for the key under the map. */
export const heatGradient = `linear-gradient(to right in oklch, ${heatStops.join(", ")})`;
