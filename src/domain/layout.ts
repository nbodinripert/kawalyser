import { shapes, type KeyRole, type ShapeId } from "./geometry";
import { isSpecialKey, SPACE } from "./symbols";
import { isValidChar, type CorpusLanguage } from "./valid-chars";

/** The four zones of a key. */
export type KeyChars = {
  base?: string;
  shift?: string;
  dk?: string;
  dkShift?: string;
};

export type Zone = keyof KeyChars;
export type Layer = "direct" | "dk";

export const layerZones: Record<Layer, { lower: Zone; upper: Zone }> = {
  direct: { lower: "base", upper: "shift" },
  dk: { lower: "dk", upper: "dkShift" },
};

export type Layout = {
  name: string;
  shapeId: ShapeId;
  keys: Record<string, KeyChars>;
};

/** A character as it can be moved on the map: a letter with its capital, or a single character. */
export type Unit =
  | { kind: "pair"; key: string; layer: Layer; lower: string; upper: string }
  | { kind: "single"; key: string; layer: Layer; zone: Zone; char: string };

export function isPair(lower: string | undefined, upper: string | undefined): boolean {
  return (
    lower !== undefined &&
    upper !== undefined &&
    lower !== upper &&
    lower.toUpperCase() === upper &&
    upper.toLowerCase() === lower
  );
}

/**
 * A letter alone in a layer gets its other case, so that it behaves like every other letter:
 * shown as a capital, typed without Shift, and moved with its capital. Without this, "è" placed
 * alone stayed in the corner it landed in, and was ignored by the analysis if it sat on the Shift side.
 */
export function completeLetterPairs(chars: KeyChars): KeyChars {
  const result = { ...chars };
  for (const layer of ["direct", "dk"] as const) {
    const { lower, upper } = layerZones[layer];
    const lowerChar = result[lower];
    const upperChar = result[upper];
    if (lowerChar !== undefined && upperChar === undefined && isPair(lowerChar, lowerChar.toUpperCase())) {
      result[upper] = lowerChar.toUpperCase();
    } else if (upperChar !== undefined && lowerChar === undefined && isPair(upperChar.toLowerCase(), upperChar)) {
      result[lower] = upperChar.toLowerCase();
    }
  }
  return result;
}

export function completeLayoutPairs(layout: Layout): Layout {
  const keys: Record<string, KeyChars> = {};
  for (const [id, chars] of Object.entries(layout.keys)) keys[id] = completeLetterPairs(chars);
  return { ...layout, keys };
}

export function layerUnits(key: string, chars: KeyChars, layer: Layer): Unit[] {
  const { lower, upper } = layerZones[layer];
  const lowerChar = chars[lower];
  const upperChar = chars[upper];

  if (isPair(lowerChar, upperChar)) {
    return [{ kind: "pair", key, layer, lower: lowerChar!, upper: upperChar! }];
  }

  const units: Unit[] = [];
  if (upperChar !== undefined) units.push({ kind: "single", key, layer, zone: upper, char: upperChar });
  if (lowerChar !== undefined) units.push({ kind: "single", key, layer, zone: lower, char: lowerChar });
  return units;
}

/** The characters a key shows for a corpus language, after the two display rules. */
export function visibleZones(chars: KeyChars, language: CorpusLanguage): Partial<Record<Zone, string>> {
  const visible = (char: string | undefined) =>
    char !== undefined && (isSpecialKey(char) || isValidChar(char, language)) ? char : undefined;

  const result: Partial<Record<Zone, string>> = {};
  for (const layer of ["direct", "dk"] as const) {
    const { lower, upper } = layerZones[layer];
    const lowerChar = visible(chars[lower]);
    const upperChar = visible(chars[upper]);
    if (isPair(lowerChar, upperChar)) {
      // Letter and capital: the specs show the capital alone in the direct layer, the small letter alone in the dk layer.
      if (layer === "direct") result[upper] = upperChar;
      else result[lower] = lowerChar;
    } else {
      if (lowerChar !== undefined) result[lower] = lowerChar;
      if (upperChar !== undefined) result[upper] = upperChar;
    }
  }
  return result;
}

/**
 * What the keys of the current shape type alone: all the engine reads (`buildKeyMap`).
 * A special key elsewhere, or on an outer key hidden by the 34-key shape, does nothing.
 */
export function baseCharsOnMap(layout: Layout): Set<string> {
  const chars = new Set<string>();
  for (const slot of shapes[layout.shapeId].keys) {
    const base = layout.keys[slot.id]?.base;
    if (base !== undefined) chars.add(base);
  }
  return chars;
}

const allZones = ["base", "shift", "dk", "dkShift"] as const;

/**
 * Whether two layouts put the same characters on the same keys. Compared by content, not by reference:
 * a session read back from storage gives two distinct objects for the same layout.
 * A key left empty by edits counts as a missing key.
 */
export function sameLayout(a: Layout, b: Layout): boolean {
  if (a === b) return true;
  if (a.shapeId !== b.shapeId) return false;
  for (const id of new Set([...Object.keys(a.keys), ...Object.keys(b.keys)])) {
    for (const zone of allZones) if (a.keys[id]?.[zone] !== b.keys[id]?.[zone]) return false;
  }
  return true;
}

export function roleOf(layout: Layout, keyId: string): KeyRole | undefined {
  return shapes[layout.shapeId].keys.find((key) => key.id === keyId)?.role;
}

export function emptyLayout(shapeId: ShapeId): Layout {
  return { name: "", shapeId, keys: {} };
}

export function isSpaceChar(char: string | undefined): boolean {
  return char === SPACE;
}
