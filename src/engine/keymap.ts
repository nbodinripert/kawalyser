import { shapes, type KeySlot } from "@/domain/geometry";
import type { Layout } from "@/domain/layout";
import { DEAD_KEY, MAGIC_KEY, REPEAT_KEY, SPACE } from "@/domain/symbols";
import { isValidChar, type CorpusLanguage } from "@/domain/valid-chars";

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
};

export type KeyMapOptions = { language: CorpusLanguage; compat?: boolean };

const rolePriority = { pad: 0, thumb: 1, outer: 2 } as const;

/**
 * Builds the key lookups. A character on several keys resolves to the main pad first,
 * then to direct access over the dead key layer (question 24 of the specs).
 */
export function buildKeyMap(layout: Layout, { language, compat = false }: KeyMapOptions): KeyMap {
  const slots = [...shapes[layout.shapeId].keys].sort((a, b) => rolePriority[a.role] - rolePriority[b.role]);
  const usable = (char: string) =>
    char === SPACE || char === DEAD_KEY || char === REPEAT_KEY || char === MAGIC_KEY || compat || isValidChar(char, language);

  const slotOf = new Map<string, KeySlot>();
  const symbolOf = new Map<string, string>();

  for (const slot of slots) {
    const base = layout.keys[slot.id]?.base;
    if (base === undefined || !usable(base)) continue;
    const symbol = toToken(base.toLowerCase());
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
      if (!compat && !isValidChar(dk, language) && Array.from(dk).length === 1) continue;
      const char = dk.toLowerCase();
      if (!compat && slotOf.has(char)) continue;
      if (deadKeySequences.has(char)) continue;
      deadKeySequences.set(char, DK + (keySymbol === SPACE ? DK_SPACE : keySymbol));
    }
  }

  return { slotOf, deadKeySequences, symbolOf };
}
