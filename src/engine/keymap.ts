import { shapes, type KeySlot } from "@/domain/geometry";
import type { Layout } from "@/domain/layout";
import { DEAD_KEY, MAGIC_KEY, REPEAT_KEY, SPACE } from "@/domain/symbols";
import { createCodec, identityCodec, type Codec } from "./codec";

/**
 * Inside the engine, each key press is one UTF-16 unit. Special keys use private-use characters,
 * so a real "#" or "*" in the corpus is never mistaken for the Magic key or the dead key.
 */
export const DK = "";
export const REPEAT = "";
export const MAGIC = "";
/** The space key pressed after the dead key: it types a character, so it must not end a word. */
export const DK_SPACE = "";

export function toToken(char: string): string {
  switch (char) {
    case DEAD_KEY:
      return DK;
    case REPEAT_KEY:
      return REPEAT;
    case MAGIC_KEY:
      return MAGIC;
    default:
      return char;
  }
}

/** Replacement files write special keys with their map symbols. */
export function keysToTokens(keys: string): string {
  return Array.from(keys, toToken).join("");
}

export function tokenLabel(token: string): string {
  switch (token) {
    case DK:
      return DEAD_KEY;
    case REPEAT:
      return REPEAT_KEY;
    case MAGIC:
      return MAGIC_KEY;
    // "_" marks the unknown middle character of skipgrams, and is now a typeable character too.
    case DK_SPACE:
    case SPACE:
      return "␣";
    default:
      return token;
  }
}

export type KeyMap = {
  /** Every symbol of the typed text, mapped to the key that types it. */
  slotOf: Map<string, KeySlot>;
  /** Characters of the dead key layer, mapped to the key presses that type them. */
  deadKeySequences: Map<string, string>;
  /** The symbol each key types when pressed alone. */
  symbolOf: Map<string, string>;
  /** Turns the corpus, the map and the replacements into one symbol per character, and back for display. */
  codec: Codec;
};

/**
 * The key presses of a replacement that this map cannot make, as written in the file. A press can be made
 * on a key, or as a character typed after the dead key. Magic, Repeat or the dead key may be missing too.
 */
export function missingKeys(keyMap: KeyMap, keys: string): string[] {
  return Array.from(keys).filter((char) => {
    const token = toToken(keyMap.codec.encode(char));
    return !keyMap.slotOf.has(token) && !keyMap.deadKeySequences.has(token);
  });
}

export function canType(keyMap: KeyMap, keys: string): boolean {
  return missingKeys(keyMap, keys).length === 0;
}

export type KeyMapOptions = { compat?: boolean };

const rolePriority = { pad: 0, thumb: 1, outer: 2 } as const;

/**
 * Builds the key lookups. A character on several keys resolves to the main pad first,
 * then to direct access over the dead key layer (question 24 of the specs).
 */
export function buildKeyMap(layout: Layout, { compat = false }: KeyMapOptions = {}): KeyMap {
  const slots = [...shapes[layout.shapeId].keys].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
  const codec = compat ? identityCodec : createCodec();

  const slotOf = new Map<string, KeySlot>();
  const symbolOf = new Map<string, string>();

  for (const slot of slots) {
    const base = layout.keys[slot.id]?.base;
    if (base === undefined) continue;
    const symbol = toToken(codec.encode(base.toLowerCase()));
    if (slotOf.has(symbol)) continue;
    slotOf.set(symbol, slot);
    symbolOf.set(slot.id, symbol);
  }

  const spaceSlot = slotOf.get(SPACE);
  if (spaceSlot) slotOf.set(DK_SPACE, spaceSlot);

  const deadKeySequences = new Map<string, string>();
  if (slotOf.has(DK)) {
    for (const slot of slots) {
      const chars = layout.keys[slot.id];
      const dk = chars?.dk;
      const keySymbol = symbolOf.get(slot.id);
      if (dk === undefined || keySymbol === undefined || keySymbol === DK) continue;
      const char = codec.encode(dk.toLowerCase());
      if (!compat && slotOf.has(char)) continue;
      if (deadKeySequences.has(char)) continue;
      deadKeySequences.set(char, DK + (keySymbol === SPACE ? DK_SPACE : keySymbol));
    }
  }

  return { slotOf, deadKeySequences, symbolOf, codec };
}
