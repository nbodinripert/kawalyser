import { isPair, layerZones, type KeyChars, type Layer, type Layout, type Zone } from "./layout";

export type ZoneRef = { key: string; zone: Zone };

export function layerOf(zone: Zone): Layer {
  return zone === "base" || zone === "shift" ? "direct" : "dk";
}

function layerIsPair(chars: KeyChars | undefined, layer: Layer): boolean {
  const { lower, upper } = layerZones[layer];
  return isPair(chars?.[lower], chars?.[upper]);
}

function withChars(layout: Layout, key: string, chars: KeyChars): Layout {
  const cleaned: KeyChars = {};
  for (const [zone, char] of Object.entries(chars) as Array<[Zone, string | undefined]>) {
    if (char !== undefined && char !== "") cleaned[zone] = char;
  }
  return { ...layout, keys: { ...layout.keys, [key]: cleaned } };
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

/**
 * Moves what sits in one zone to another zone, swapping with what was there.
 * A letter and its capital always travel together, so a move that involves one swaps whole layers.
 */
export function moveZone(layout: Layout, from: ZoneRef, to: ZoneRef): Layout {
  if (from.key === to.key && from.zone === to.zone) return layout;
  const fromChars = layout.keys[from.key];
  if (fromChars?.[from.zone] === undefined && !layerIsPair(fromChars, layerOf(from.zone))) return layout;

  const fromLayer = layerOf(from.zone);
  const toLayer = layerOf(to.zone);

  if (layerIsPair(fromChars, fromLayer) || layerIsPair(layout.keys[to.key], toLayer)) {
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
  if (typed.length === 0) return layout;
  const existing = findChar(layout, typed);
  if (existing) {
    const sameLayer = existing.key === at.key && layerOf(existing.zone) === layerOf(at.zone);
    if (sameLayer && (existing.zone === at.zone || layerIsPair(layout.keys[at.key], layerOf(at.zone)))) return layout;
    return moveZone(layout, existing, at);
  }

  const layer = layerOf(at.zone);
  const { lower, upper } = layerZones[layer];
  const chars = layout.keys[at.key];
  const otherZone = at.zone === lower ? upper : lower;
  const layerHeldPair = layerIsPair(chars, layer);
  const otherIsFree = layerHeldPair || chars?.[otherZone] === undefined;

  if (isLetter(typed) && otherIsFree) {
    return setZones(layout, at.key, { [lower]: typed.toLowerCase(), [upper]: typed.toUpperCase() });
  }
  if (layerHeldPair) {
    return setZones(layout, at.key, { [lower]: undefined, [upper]: undefined, [at.zone]: typed });
  }
  return setZones(layout, at.key, { [at.zone]: typed });
}
