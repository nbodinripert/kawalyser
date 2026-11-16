/**
 * The engine reads one UTF-16 unit per key press. A character outside the Basic Multilingual Plane, an emoji
 * or a rare ideogram, takes two units: left as is, it would count as two characters (v2 specs, corpus import).
 * The codec gives each such character a private-use symbol of its own for the time of one analysis,
 * and gives the character back for display. A private-use character of the corpus goes through it too,
 * so that it is never mistaken for a special key or for another character's symbol.
 */
export type Codec = {
  encode(text: string): string;
  decode(text: string): string;
};

/** After the special keys' symbols (U+E000 to U+E003, see keymap.ts), up to the end of the private-use area. */
const FIRST_SYMBOL = 0xe100;
const LAST_SYMBOL = 0xf8ff;
/** Shown for every character past the 6,000th distinct one: they then share the last symbol. */
const OVERFLOW_LABEL = "\ufffd";

const encoded = /[\ud800-\udbff][\udc00-\udfff]|[\ue000-\uf8ff]/g;
const symbols = /[\ue100-\uf8ff]/g;

/** Reproduces the Excel analyser, which reads two units for such a character. */
export const identityCodec: Codec = { encode: (text) => text, decode: (text) => text };

export function createCodec(): Codec {
  const symbolOf = new Map<string, string>();
  const charOf = new Map<string, string>();
  let next = FIRST_SYMBOL;

  const symbolFor = (char: string) => {
    let symbol = symbolOf.get(char);
    if (symbol === undefined) {
      symbol = String.fromCharCode(Math.min(next, LAST_SYMBOL));
      if (next <= LAST_SYMBOL) charOf.set(symbol, next === LAST_SYMBOL ? OVERFLOW_LABEL : char);
      next++;
      symbolOf.set(char, symbol);
    }
    return symbol;
  };

  return {
    encode: (text) => text.replace(encoded, symbolFor),
    decode: (text) => text.replace(symbols, (symbol) => charOf.get(symbol) ?? symbol),
  };
}
