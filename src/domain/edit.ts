import { isSpecialKey } from "./symbols";
import { completeLetterPairs, isPair, layerZones, type KeyChars, type Layer, type Layout, type Zone } from "./layout";

export type ZoneRef = { key: string; zone: Zone };

export function layerOf(zone: Zone): Layer {
  return zone === "base" || zone === "shift" ? "direct" : "dk";
}

function layerIsPair(chars: KeyChars | undefined, layer: Layer): boolean {
  const { lower, upper } = layerZones[layer];
  return isPair(chars?.[lower], chars?.[upper]);
}

/** A letter with a one-character capital: it always fills its whole layer. */
function isPairableLetter(char: string | undefined): boolean {
  return char !== undefined && isPair(char.toLowerCase(), char.toUpperCase());
}

function layerHoldsLetter(chars: KeyChars | undefined, layer: Layer): boolean {
  const { lower, upper } = layerZones[layer];
  return isPairableLetter(chars?.[lower]) || isPairableLetter(chars?.[upper]);
}

function withChars(layout: Layout, key: string, chars: KeyChars): Layout {
  const cleaned: KeyChars = {};
  for (const [zone, char] of Object.entries(chars) as Array<[Zone, string | undefined]>) {
    if (char !== undefined && char !== "") cleaned[zone] = char;
  }
  return { ...layout, keys: { ...layout.keys, [key]: completeLetterPairs(cleaned) } };
}

function setZones(layout: Layout, key: string, values: Partial<Record<Zone, string | undefined>>): Layout {
  return withChars(layout, key, { ...layout.keys[key], ...values });
}

function swapLayers(layout: Layout, a: { key: string; layer: Layer }, b: { key: string; layer: Layer }): Layout {
  const za = layerZones[a.layer];
  const zb = layerZones[b.layer];
  const aChars = layout.keys[a.key];
  const bChars = layout.keys[b.key];
  const aLower = aChars?.[za.lower];
  const aUpper = aChars?.[za.upper];
  const bLower = bChars?.[zb.lower];
  const bUpper = bChars?.[zb.upper];

  let next = setZones(layout, a.key, { [za.lower]: bLower, [za.upper]: bUpper });
  next = setZones(next, b.key, { [zb.lower]: aLower, [zb.upper]: aUpper });
  return next;
}

/** The outcome of an edit. `refused` names the special key the edit would have sent where it does nothing. */
export type EditResult = { layout: Layout; refused?: string };

/**
 * Moves what sits in one zone to another zone, swapping with what was there.
 * A letter always fills its whole layer with its capital, so a move that involves a letter swaps whole layers,
 * even when the layer also holds a character hidden for the current language.
 */
export function moveZone(layout: Layout, from: ZoneRef, to: ZoneRef): Layout {
  return tryMove(layout, from, to).layout;
}

/** Like `moveZone`, and says which special key made it refuse the move. */
export function tryMove(layout: Layout, from: ZoneRef, to: ZoneRef): EditResult {
  // A special key only works in the base zone, so it lands there wherever it is dropped on the key.
  if (isSpecialKey(layout.keys[from.key]?.[from.zone])) to = { key: to.key, zone: "base" };
  if (from.key === to.key && from.zone === to.zone) return { layout };
  const fromChars = layout.keys[from.key];
  if (fromChars?.[from.zone] === undefined && !layerIsPair(fromChars, layerOf(from.zone))) return { layout };
  const next = swap(layout, from, to);
  const refused = newlyMisplaced(layout, next);
  return refused === undefined ? { layout: next } : { layout, refused };
}

/** The special keys that sit where the engine ignores them: anywhere but the base zone. */
function misplacedSpecialKeys(layout: Layout): string[] {
  const found: string[] = [];
  for (const chars of Object.values(layout.keys)) {
    for (const zone of ["shift", "dk", "dkShift"] as const) {
      const char = chars[zone];
      if (char !== undefined && isSpecialKey(char)) found.push(char);
    }
  }
  return found;
}

/**
 * A swap can send the special key that was in the way to the zone the moved character came from.
 * If that zone is not a base zone, the swap is refused, so that a special key never ends up ignored.
 */
function newlyMisplaced(before: Layout, after: Layout): string | undefined {
  const was = misplacedSpecialKeys(before);
  const now = misplacedSpecialKeys(after);
  if (now.length <= was.length) return undefined;
  return now.find((char) => !was.includes(char)) ?? now[0];
}

function swap(layout: Layout, from: ZoneRef, to: ZoneRef): Layout {
  const fromChars = layout.keys[from.key];
  const fromLayer = layerOf(from.zone);
  const toLayer = layerOf(to.zone);

  if (layerHoldsLetter(fromChars, fromLayer) || layerHoldsLetter(layout.keys[to.key], toLayer)) {
    if (from.key === to.key && fromLayer === toLayer) return layout;
    return swapLayers(layout, { key: from.key, layer: fromLayer }, { key: to.key, layer: toLayer });
  }

  const moving = fromChars?.[from.zone];
  const replaced = layout.keys[to.key]?.[to.zone];
  if (from.key === to.key) {
    return setZones(layout, from.key, { [from.zone]: replaced, [to.zone]: moving });
  }
  const next = setZones(layout, from.key, { [from.zone]: replaced });
  return setZones(next, to.key, { [to.zone]: moving });
}

/** How far into a key the pointer must go to leave the dragged character's own layer or row. */
const CROSSING = 0.65;

/**
 * Picks the zone a dragged character lands in, from where the pointer sits in the target key
 * (x and y from 0 to 1). The character keeps its layer and row unless the pointer clearly
 * goes into the other side: dropping "A" anywhere on "O" swaps the two letters, while the
 * right edge of a key holds the dead key layer.
 */
export function dropZone(from: Zone, x: number, y: number): Zone {
  const fromRight = from === "dk" || from === "dkShift";
  const fromUpper = from === "shift" || from === "dkShift";
  const right = fromRight ? x > 1 - CROSSING : x > CROSSING;
  const upper = fromUpper ? y < CROSSING : y < 1 - CROSSING;
  const { lower, upper: upperZone } = layerZones[right ? "dk" : "direct"];
  return upper ? upperZone : lower;
}

function isLetter(char: string): boolean {
  return char.toLowerCase() !== char.toUpperCase();
}

/** Finds where a character already sits, ignoring case for letters. */
export function findChar(layout: Layout, char: string): ZoneRef | undefined {
  const target = isLetter(char) ? char.toLowerCase() : char;
  for (const [key, chars] of Object.entries(layout.keys)) {
    for (const zone of ["base", "dk", "shift", "dkShift"] as const) {
      const value = chars[zone];
      if (value === undefined) continue;
      const comparable = isLetter(value) ? value.toLowerCase() : value;
      if (comparable === target) return { key, zone };
    }
  }
  return undefined;
}

/**
 * Puts a typed character in a zone. If the character is already on the map, the two swap;
 * otherwise it replaces what was there, which leaves the map.
 */
export function typeIntoZone(layout: Layout, at: ZoneRef, typed: string): Layout {
  return tryType(layout, at, typed).layout;
}

/** Like `typeIntoZone`, and says which special key made it refuse the edit. */
export function tryType(layout: Layout, at: ZoneRef, typed: string): EditResult {
  if (typed.length === 0) return { layout };
  if (isSpecialKey(typed)) at = { key: at.key, zone: "base" };
  const existing = findChar(layout, typed);
  if (existing) {
    const sameLayer = existing.key === at.key && layerOf(existing.zone) === layerOf(at.zone);
    if (sameLayer && (existing.zone === at.zone || layerIsPair(layout.keys[at.key], layerOf(at.zone)))) return { layout };
    return tryMove(layout, existing, at);
  }

  const layer = layerOf(at.zone);
  const { lower, upper } = layerZones[layer];
  const chars = layout.keys[at.key];

  // A typed letter fills the whole layer with its capital, like every letter on the map.
  if (isPairableLetter(typed)) {
    return { layout: setZones(layout, at.key, { [lower]: typed.toLowerCase(), [upper]: typed.toUpperCase() }) };
  }
  // A symbol typed over a letter replaces the letter and its capital.
  if (layerHoldsLetter(chars, layer)) {
    return { layout: setZones(layout, at.key, { [lower]: undefined, [upper]: undefined, [at.zone]: typed }) };
  }
  return { layout: setZones(layout, at.key, { [at.zone]: typed }) };
}

/**
 * Empties a zone. A letter always comes with its capital, so deleting either one empties the whole layer
 * (see `completeLetterPairs`: leaving the capital alone would bring the letter back).
 */
export function clearZone(layout: Layout, at: ZoneRef): Layout {
  const chars = layout.keys[at.key];
  const layer = layerOf(at.zone);
  if (layerHoldsLetter(chars, layer)) {
    const { lower, upper } = layerZones[layer];
    return setZones(layout, at.key, { [lower]: undefined, [upper]: undefined });
  }
  if (chars?.[at.zone] === undefined) return layout;
  return setZones(layout, at.key, { [at.zone]: undefined });
}
