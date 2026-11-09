import { parse as parseToml } from "smol-toml";
import { mainKeyId, shapes, thumbKeyIds, type ShapeId } from "./geometry";
import { completeLayoutPairs, type KeyChars, type Layout } from "./layout";
import { DEAD_KEY, isSpecialKey, MAGIC_KEY, REPEAT_KEY, SPACE } from "./symbols";

/**
 * Reads the layout files of Kalamine (https://github.com/OneDeadKey/kalamine).
 * For each of the four rows of the drawing, a geometry gives the text column of the first key and the key names.
 * Keys are 6 columns apart; inside a key, the left character sits on that column and the right one 2 columns further.
 */
type Geometry = Array<{ offset: number; keys: string[] }>;

function range(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
}

const geometries: Record<string, Geometry> = {
  ANSI: [
    { offset: 2, keys: ["tlde", ...range("ae", 12)] },
    { offset: 11, keys: [...range("ad", 12), "bksl"] },
    { offset: 12, keys: range("ac", 11) },
    { offset: 15, keys: range("ab", 10) },
  ],
  ISO: [
    { offset: 2, keys: ["tlde", ...range("ae", 12)] },
    { offset: 11, keys: range("ad", 12) },
    { offset: 12, keys: [...range("ac", 11), "bksl"] },
    { offset: 9, keys: ["lsgt", ...range("ab", 10)] },
  ],
  ERGO: [
    { offset: 2, keys: ["tlde", ...range("ae", 12)] },
    { offset: 8, keys: range("ad", 12) },
    { offset: 8, keys: [...range("ac", 11), "bksl"] },
    { offset: 2, keys: ["lsgt", ...range("ab", 10)] },
  ],
  ALT: [
    { offset: 2, keys: ["tlde", ...range("ae", 12), "bksl"] },
    { offset: 11, keys: range("ad", 12) },
    { offset: 12, keys: range("ac", 11) },
    { offset: 15, keys: range("ab", 10) },
  ],
};

export const supportedGeometries = Object.keys(geometries);

/**
 * Where each named key of the file lands on the map. The number row and AltGr are ignored.
 * The two left purple keys go to the lower two outer keys on the left, the two right ones to the right.
 */
function placement(): Record<string, string> {
  const result: Record<string, string> = {
    ad11: mainKeyId(1, 0),
    ac11: mainKeyId(2, 0),
    ad12: mainKeyId(1, 11),
    bksl: mainKeyId(2, 11),
    lsgt: thumbKeyIds.leftOuter,
  };
  ["ad", "ac", "ab"].forEach((prefix, row) => {
    // Grid columns 1 to 10 are the main pad; 0 and 11 are the outer keys.
    for (let i = 1; i <= 10; i++) {
      result[`${prefix}${String(i).padStart(2, "0")}`] = mainKeyId(row, i);
    }
  });
  return result;
}

export type ImportProblem =
  | { kind: "unreadable"; detail: string }
  | { kind: "no-layer" }
  | { kind: "unknown-geometry"; geometry: string };

export type ImportedLayout = { ok: true; layout: Layout; droppedReserved: string[] } | { ok: false; problem: ImportProblem };

type Cell = { upperLeft?: string; lowerLeft?: string; upperRight?: string; lowerRight?: string };

/** Reads one slot; "*x" (marker one column before) is a dead key, "**" the 1DK. */
function slot(chars: string[], position: number): string | undefined {
  const char = chars[position];
  if (char === undefined || char === " ") return undefined;
  if (chars[position - 1] === "*") return char === "*" ? "**" : `*${char}`;
  return char;
}

function readDrawing(drawing: string, geometry: Geometry): Map<string, Cell> {
  const lines = drawing.split("\n");
  if (lines[0]?.trim() === "") lines.shift();
  const cells = new Map<string, Cell>();
  geometry.forEach(({ offset, keys }, row) => {
    const upper = Array.from(lines[1 + row * 3] ?? "");
    const lower = Array.from(lines[2 + row * 3] ?? "");
    keys.forEach((name, index) => {
      const position = offset + index * 6;
      cells.set(name, {
        upperLeft: slot(upper, position),
        lowerLeft: slot(lower, position),
        upperRight: slot(upper, position + 2),
        lowerRight: slot(lower, position + 2),
      });
    });
  });
  return cells;
}

function normalize(char: string): string {
  return char === "’" ? "'" : char;
}

/** File notation to map notation. Other dead keys are left out (see question 23 of the specs). */
function toMapChar(value: string | undefined, dropped: Set<string>): string | undefined {
  if (value === undefined) return undefined;
  if (value === "**") return DEAD_KEY;
  if (value.startsWith("*") && value.length === 2) return undefined;
  if (isSpecialKey(value)) {
    // "*", "$" and "#" are reserved for the special keys.
    dropped.add(value);
    return undefined;
  }
  return normalize(value);
}

function keyCharsFromCell(cell: Cell, withDeadKeyLayer: boolean, dropped: Set<string>): KeyChars {
  const chars: KeyChars = {};
  const base = toMapChar(cell.lowerLeft, dropped);
  const shift = toMapChar(cell.upperLeft, dropped);
  if (shift !== undefined) chars.shift = shift;
  // A character alone at the top means the same key without Shift, lowercased.
  const effectiveBase = base ?? (cell.lowerLeft === undefined ? shift?.toLowerCase() : undefined);
  if (effectiveBase !== undefined) chars.base = effectiveBase;

  if (withDeadKeyLayer) {
    const dk = toMapChar(cell.lowerRight, dropped);
    const dkShift = toMapChar(cell.upperRight, dropped);
    const effectiveDk = dk ?? (cell.lowerRight === undefined ? dkShift?.toLowerCase() : undefined);
    if (effectiveDk !== undefined) chars.dk = effectiveDk;
    // A lone lowercase dead key character implies its capital, which is not stored separately.
    if (dkShift !== undefined && dkShift !== effectiveDk) chars.dkShift = dkShift;
  }
  return chars;
}

function spacebarChar(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? normalize(value) : undefined;
}

export function importKalamine(source: string, shapeId: ShapeId): ImportedLayout {
  let document: Record<string, unknown>;
  try {
    document = parseToml(source) as Record<string, unknown>;
  } catch (error) {
    return { ok: false, problem: { kind: "unreadable", detail: error instanceof Error ? error.message : String(error) } };
  }

  const geometryName = typeof document.geometry === "string" ? document.geometry.toUpperCase() : "ISO";
  const geometry = geometries[geometryName];
  if (!geometry) return { ok: false, problem: { kind: "unknown-geometry", geometry: geometryName } };

  // "base" holds the dead key layer on the right of each key; "full" holds AltGr there instead.
  const withDeadKeyLayer = typeof document.base === "string";
  const drawing = withDeadKeyLayer ? document.base : document.full;
  if (typeof drawing !== "string") return { ok: false, problem: { kind: "no-layer" } };

  const cells = readDrawing(drawing, geometry);
  const slotIds = new Set(shapes[shapeId].keys.map((key) => key.id));
  const dropped = new Set<string>();
  const keys: Record<string, KeyChars> = {};

  for (const [name, target] of Object.entries(placement())) {
    const cell = cells.get(name);
    if (!cell || !slotIds.has(target)) continue;
    const chars = keyCharsFromCell(cell, withDeadKeyLayer, dropped);
    if (Object.keys(chars).length > 0) keys[target] = chars;
  }

  const spacebar = (document.spacebar ?? {}) as Record<string, unknown>;
  const space: KeyChars = { base: SPACE };
  const dkSpace = spacebarChar(spacebar["1dk"]);
  const dkShiftSpace = spacebarChar(spacebar["1dk_shift"]);
  if (dkSpace !== undefined) space.dk = dkSpace;
  if (dkShiftSpace !== undefined && dkShiftSpace !== dkSpace) space.dkShift = dkShiftSpace;

  keys[thumbKeyIds.leftInner] = { base: MAGIC_KEY };
  keys[thumbKeyIds.rightInner] = { base: REPEAT_KEY };
  keys[thumbKeyIds.rightOuter] = space;

  const name = typeof document.name === "string" ? document.name : "";
  // Kalamine writes a dead key letter without its capital; on the map every letter comes with it.
  return { ok: true, layout: completeLayoutPairs({ name, shapeId, keys }), droppedReserved: [...dropped] };
}
