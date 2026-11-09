import { mainKeyId, thumbKeyIds } from "@/domain/geometry";
import type { KeyChars, Layout } from "@/domain/layout";
import type { Replacements } from "@/domain/replacements";

/** Reads a workbook extract (see the README of this folder) into the site's formats. */
export type ExcelFixture = {
  keys: Record<string, { coord: string; shift: string | null; base: string | null; dk: string | null; dkShift: string | null }>;
  corrections: Array<{ text: string; keys: string }>;
  cleverKeys: Array<{ text: string; keys: string; before: string | null; after: string | null }>;
  analyse: Record<string, number | null>;
  trigrammes: Record<string, string | number>;
  doigts: Record<string, string | number>;
  difficultesTotals: Record<string, string | number>;
  ngramsHeader: Record<string, string | number>;
};

/** The Excel analyser writes the dead key "&", Magic "€" and the space bar "espace". */
function fromExcelChar(char: string): string {
  if (char === "&") return "*";
  if (char === "€") return "#";
  if (char === "espace") return " ";
  return char;
}

function fromExcelKeys(keys: string): string {
  return Array.from(keys, fromExcelChar).join("");
}

function slotId(row: number, col: number): string {
  if (col === 6) return row === 2 ? thumbKeyIds.leftOuter : thumbKeyIds.leftInner;
  if (col === 7) return row === 2 ? thumbKeyIds.rightOuter : thumbKeyIds.rightInner;
  return mainKeyId(row - 1, col < 6 ? col : col - 2);
}

export function layoutFromFixture(fixture: ExcelFixture): Layout {
  const keys: Record<string, KeyChars> = {};
  for (const cell of Object.values(fixture.keys)) {
    const [row, col] = cell.coord.split(",").map(Number) as [number, number];
    const shift = cell.shift === null ? undefined : fromExcelChar(String(cell.shift));
    const base = cell.base === null ? shift?.toLowerCase() : fromExcelChar(String(cell.base));
    const chars: KeyChars = {};
    if (base !== undefined) chars.base = base;
    if (shift !== undefined && shift !== base) chars.shift = shift;
    if (cell.dk !== null) chars.dk = fromExcelChar(String(cell.dk));
    keys[slotId(row, col)] = chars;
  }
  return { name: "fixture", shapeId: "split34", keys };
}

export function replacementsFromFixture(fixture: ExcelFixture): Replacements {
  return {
    corrections: fixture.corrections.map((rule) => ({ text: rule.text, keys: fromExcelKeys(rule.keys) })),
    cleverKeys: fixture.cleverKeys.map((rule) => ({
      text: rule.text,
      keys: fromExcelKeys(rule.keys),
      ...(rule.before ? { noLetterBefore: true, allowedBefore: [rule.before] } : {}),
      ...(rule.after ? { noLetterAfter: true, allowedAfter: [rule.after] } : {}),
    })),
  };
}
