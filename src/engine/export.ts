import type { AnalysisDetail } from "./analyse";
import { tokenLabel } from "./keymap";

/**
 * CSV files laid out like the Excel sheets "Ngrams refined" and "Difficultés": blocks side by side,
 * so that they open the same way in a spreadsheet. A UTF-8 byte order mark helps Excel read accents.
 */
export type CsvOptions = { separator: "," | ";"; headers: CsvHeaders };

export type CsvHeaders = {
  words: string;
  typed: string;
  count: string;
  quadrigrams: string;
  trigrams: string;
  bigrams: string;
  characters: string;
  layoutCount: string;
  corpusCount: string;
  change: string;
  share: string;
  lists: Record<string, string>;
};

type Block = { headers: string[]; rows: Array<Array<string | number>> };

function cellLabel(char: string): string {
  return char === " " ? "espace" : tokenLabel(char);
}

function gramLabel(gram: string): string {
  if (gram === " ") return "espace";
  return Array.from(gram, (char) => (char === " " ? "_" : tokenLabel(char))).join("");
}

function escape(value: string | number, separator: string): string {
  // With semicolons (French spreadsheets), decimals take a comma.
  const text = typeof value === "number" ? (separator === ";" ? String(value).replace(".", ",") : String(value)) : value;
  return /["\n\r]/.test(text) || text.includes(separator) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sideBySide(blocks: Block[], separator: string): string {
  const height = Math.max(0, ...blocks.map((block) => block.rows.length));
  const line = (cells: Array<string | number>) => cells.map((cell) => escape(cell, separator)).join(separator);
  const lines = [line(blocks.flatMap((block, index) => [...block.headers, ...(index < blocks.length - 1 ? [""] : [])]))];
  for (let row = 0; row < height; row++) {
    lines.push(
      line(
        blocks.flatMap((block, index) => {
          const cells = block.rows[row] ?? block.headers.map(() => "");
          return [...cells, ...(index < blocks.length - 1 ? [""] : [])];
        }),
      ),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

const byCount = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1]);

function ngramBlock(map: Map<string, number>, size: number, title: string, count: string): Block {
  return {
    headers: [title, ...Array.from({ length: size }, (_, i) => String(i + 1)), count],
    rows: byCount(map).map(([gram, n]) => [gramLabel(gram), ...Array.from(gram, cellLabel), n]),
  };
}

export function ngramsCsv(detail: AnalysisDetail, { separator, headers }: CsvOptions): string {
  const { counts } = detail;
  const words: Block = {
    headers: [headers.words, headers.typed, headers.count],
    rows: byCount(counts.words).map(([word, n]) => [word, gramLabel(counts.typedWords.get(word) ?? word), n]),
  };

  const characters: Block = {
    headers: [headers.characters, headers.layoutCount, headers.corpusCount, headers.change],
    rows: byCount(counts.ngrams[0]).map(([char, n]) => {
      const original = counts.originalChars.get(char);
      const change = original ? n / original - 1 : "";
      return [cellLabel(char), n, original ?? "", typeof change === "number" && Math.abs(change) >= 0.0005 ? Number(change.toFixed(4)) : ""];
    }),
  };

  return sideBySide(
    [
      words,
      ngramBlock(counts.ngrams[3], 4, headers.quadrigrams, headers.count),
      ngramBlock(counts.ngrams[2], 3, headers.trigrams, headers.count),
      ngramBlock(counts.ngrams[1], 2, headers.bigrams, headers.count),
      characters,
    ],
    separator,
  );
}

export function difficultiesCsv(detail: AnalysisDetail, { separator, headers }: CsvOptions): string {
  const { difficultyTallies: d, trigramTallies: t, counts, usage, replacementOf } = detail;
  const withoutSpace = t.classified[1] + t.classified[2];
  const all = withoutSpace + t.classified[0];
  const skipgrams = t.skipgramBase[1] + t.skipgramBase[2];

  const block = (id: string, map: Map<string, number>, denominator: number): Block => ({
    headers: [headers.lists[id] ?? id, headers.count, headers.share],
    rows: byCount(map).map(([gram, n]) => [gramLabel(gram), n, denominator ? Number((n / denominator).toFixed(6)) : ""]),
  });

  const cognitive: Block = {
    headers: [headers.lists.cc ?? "cc", headers.typed, headers.count, headers.share],
    rows: byCount(usage).map(([pattern, n]) => [
      gramLabel(pattern),
      gramLabel(replacementOf.get(pattern) ?? ""),
      n,
      Number((n / counts.originalPresses).toFixed(6)),
    ]),
  };

  const repeated = (map: Map<string, number>) => new Map([...map].filter(([, n]) => n > 1));

  return sideBySide(
    [
      block("sfb", d.sfb, d.bigramTotal),
      block("skb", d.skb, d.bigramTotal),
      block("lsb", d.lsb, d.bigramTotal),
      block("fsb", d.fsb, d.bigramTotal),
      block("hsb", d.hsb, d.bigramTotal),
      block("rjb", d.rjb, d.bigramTotal),
      block("badRedirects", d.badRedirects, withoutSpace),
      block("sfsRedirect", d.sfsRedirect, all),
      block("sfsAlternation", d.sfsAlternation, all),
      block("fssRedirect", d.fssRedirect, skipgrams),
      block("fssAlternation", d.fssAlternation, skipgrams),
      cognitive,
      block("shs4", repeated(counts.sameHand.four), 0),
      block("shs5", repeated(counts.sameHand.fiveOrMore), 0),
    ],
    separator,
  );
}
