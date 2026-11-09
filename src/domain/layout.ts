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

export function roleOf(layout: Layout, keyId: string): KeyRole | undefined {
  return shapes[layout.shapeId].keys.find((key) => key.id === keyId)?.role;
}

export function emptyLayout(shapeId: ShapeId): Layout {
  return { name: "", shapeId, keys: {} };
}

export function isSpaceChar(char: string | undefined): boolean {
  return char === SPACE;
}
