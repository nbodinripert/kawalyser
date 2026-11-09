import { shapes } from "./geometry";
import type { Layout } from "./layout";
import { isSpecialKey } from "./symbols";

export type Duplicate = { char: string; layer: "direct" | "dk"; keys: string[] };

/**
 * A character on two keys of the main pad, in the same layer, is an error (question 24 of the specs):
 * the analyser cannot tell which key would be typed. Any other duplicate is resolved by priority.
 */
export function findBlockingDuplicates(layout: Layout): Duplicate[] {
  const padKeys = new Set(shapes[layout.shapeId].keys.filter((key) => key.role === "pad").map((key) => key.id));
  const seen = new Map<string, string[]>();

  for (const [keyId, chars] of Object.entries(layout.keys)) {
    if (!padKeys.has(keyId)) continue;
    for (const [layer, zone] of [
      ["direct", "base"],
      ["dk", "dk"],
    ] as const) {
      const char = chars[zone];
      if (char === undefined || isSpecialKey(char)) continue;
      const id = `${layer}:${char.toLowerCase()}`;
      seen.set(id, [...(seen.get(id) ?? []), keyId]);
    }
  }

  return [...seen.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([id, keys]) => {
      const [layer, char] = id.split(":") as ["direct" | "dk", string];
      return { char, layer, keys };
    });
}
