/**
 * Reads a corpus file the user imports (v2 specs). It stays in the browser: the analysis of a personal corpus
 * runs there (question 28 of the specs).
 */

/** 10 MB, more than twice the French corpus (question 29). */
export const MAX_CORPUS_BYTES = 10 * 1024 * 1024;

export type CorpusEncoding = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252";

export type DecodedCorpus =
  | { ok: true; text: string; encoding: CorpusEncoding }
  | { ok: false; problem: "empty" | "too-large" | "not-text" };

/** A file that starts with a byte order mark says how it is encoded, as Windows saves UTF-8 and UTF-16 files. */
function encodingFromBom(bytes: Uint8Array): CorpusEncoding | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";
  return null;
}

/**
 * Control characters other than tabs and line breaks, C1 ones included: what a Word, PDF or other binary file
 * turns into once read as text. A few may slip into a real text, hence the share.
 */
const controlChars = /[\x00-\x08\x0b\x0e-\x1f\x7f-\x9f]/g;
const MAX_CONTROL_SHARE = 0.01;

function looksLikeText(text: string): boolean {
  if (text.includes("\0")) return false;
  return (text.match(controlChars)?.length ?? 0) <= text.length * MAX_CONTROL_SHARE;
}

/**
 * UTF-8 first, then Windows-1252, as the v2 specs ask. Decoding as Windows-1252 never fails,
 * since every byte gives a character: a file that is not text is told apart by its control characters instead.
 */
export function decodeCorpus(bytes: Uint8Array): DecodedCorpus {
  if (bytes.length > MAX_CORPUS_BYTES) return { ok: false, problem: "too-large" };

  let encoding = encodingFromBom(bytes);
  let text: string;
  if (encoding) {
    // The decoder drops the byte order mark.
    text = new TextDecoder(encoding).decode(bytes);
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      encoding = "utf-8";
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
      encoding = "windows-1252";
    }
  }

  if (text.trim() === "") return { ok: false, problem: "empty" };
  if (!looksLikeText(text)) return { ok: false, problem: "not-text" };
  return { ok: true, text, encoding };
}
