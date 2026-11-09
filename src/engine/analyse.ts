import { shapes } from "@/domain/geometry";
import type { Layout } from "@/domain/layout";
import type { AnalysisLevel, Replacements } from "@/domain/replacements";
import { SPACE } from "@/domain/symbols";
import type { CorpusLanguage } from "@/domain/valid-chars";
import { createAdapter } from "./adapt";
import { countCorpus, type CorpusCounts } from "./count";
import { buildKeyMap, DK_SPACE, tokenLabel, type KeyMap } from "./keymap";
import {
  emptyDifficulties,
  tallyBigrams,
  tallyTrigrams,
  trigramScopes,
  type DifficultyTallies,
  type TrigramScope,
  type TrigramTallies,
} from "./metrics";

export type AnalysisInput = {
  layout: Layout;
  replacements: Replacements;
  level: AnalysisLevel;
  language: CorpusLanguage;
  compat?: boolean;
};

export type ListEntry = { gram: string; count: number; share: number };

export type TrigramStats = {
  alternation: number;
  rolls: number;
  inward: number;
  outward: number;
  oneHand: number;
  ratio: number;
  redirects: number;
};

export const difficultyIds = ["sfb", "skb", "lsb", "fsb", "hsb", "rjb", "badRedirects", "sfs", "sts", "fss", "cc", "shs"] as const;
export type DifficultyId = (typeof difficultyIds)[number];

export const listIds = [
  "sfb",
  "skb",
  "lsb",
  "fsb",
  "hsb",
  "rjb",
  "badRedirects",
  "sfsRedirect",
  "sfsAlternation",
  "fssRedirect",
  "fssAlternation",
  "cc",
  "shs4",
  "shs5",
] as const;
export type ListId = (typeof listIds)[number];

export type HandSplit = { left: number; right: number };

export type AnalysisResult = {
  /** Key presses per key of the map. */
  keyPresses: Record<string, number>;
  fingers: Array<{ home: number; other: number }>;
  hands: {
    innerColumns: HandSplit;
    outerColumns: HandSplit;
    withoutThumbs: HandSplit;
    overall: HandSplit;
  };
  homeKeys: { withSpace: number; withoutSpace: number };
  pressesChange: number;
  trigrams: Record<TrigramScope, TrigramStats>;
  difficulties: Record<DifficultyId, number>;
  distribution: { distance: number[]; scissors: number[]; stretch: number[] };
  lists: Record<ListId, { total: number; entries: ListEntry[] }>;
  totals: { characters: number; corpusPresses: number; words: number };
};

const LIST_LIMIT = 300;

const label = (gram: string) => Array.from(gram, tokenLabel).join("");

function sum(values: number[], from: number): number {
  let total = 0;
  for (let i = from; i < values.length; i++) total += values[i] ?? 0;
  return total;
}

const ratio = (part: number, whole: number) => (whole === 0 ? 0 : part / whole);

function trigramStats(t: TrigramTallies, scope: TrigramScope): TrigramStats {
  const from = trigramScopes.indexOf(scope);
  const total = sum(t.classified, from);
  const inward = sum(t.inwardRolls, from) + sum(t.inwardOneHand, from);
  const outward = sum(t.outwardRolls, from) + sum(t.outwardOneHand, from);
  return {
    alternation: ratio(sum(t.alternation, from), total),
    rolls: ratio(sum(t.rolls, from), total),
    inward: ratio(sum(t.inwardRolls, from), total),
    outward: ratio(sum(t.outwardRolls, from), total),
    oneHand: ratio(sum(t.oneHand, from), total),
    ratio: ratio(inward, outward),
    redirects: ratio(sum(t.redirects, from), total),
  };
}

function toList(map: Map<string, number>, denominator: number, labelOf: (gram: string) => string = label) {
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  let total = 0;
  for (const [, count] of entries) total += count;
  return {
    total,
    entries: entries.slice(0, LIST_LIMIT).map(([gram, count]) => ({ gram: labelOf(gram), count, share: ratio(count, denominator) })),
  };
}

export type AnalysisDetail = {
  result: AnalysisResult;
  counts: CorpusCounts;
  keyMap: KeyMap;
  usage: Map<string, number>;
  replacementOf: Map<string, string>;
  trigramTallies: TrigramTallies;
  difficultyTallies: DifficultyTallies;
};

export function analyse(corpus: string, input: AnalysisInput): AnalysisDetail {
  const { layout, replacements, level, language, compat = false } = input;
  const keyMap = buildKeyMap(layout, { language, compat });
  const adapter = createAdapter(keyMap, replacements, { level, language, compat });
  const counts = countCorpus(corpus, keyMap, adapter);

  const d = emptyDifficulties();
  const t = tallyTrigrams(counts, keyMap, d, compat);
  tallyBigrams(counts, keyMap, d, compat);

  const shape = shapes[layout.shapeId];
  const chars = counts.ngrams[0];

  // Key presses per key; the space key also types the character after the dead key.
  const keyPresses: Record<string, number> = {};
  for (const slot of shape.keys) {
    const symbol = keyMap.symbolOf.get(slot.id);
    let presses = symbol === undefined ? 0 : (chars.get(symbol) ?? 0);
    if (symbol === SPACE) presses += chars.get(DK_SPACE) ?? 0;
    keyPresses[slot.id] = presses;
  }

  let total = 0;
  const fingers = Array.from({ length: 10 }, () => ({ home: 0, other: 0 }));
  const hands = {
    innerColumns: { left: 0, right: 0 },
    outerColumns: { left: 0, right: 0 },
    withoutThumbs: { left: 0, right: 0 },
    overall: { left: 0, right: 0 },
  };
  let nonThumbTotal = 0;
  let home = 0;
  let spacePresses = 0;
  let spaceOnHome = 0;

  for (const slot of shape.keys) {
    const presses = keyPresses[slot.id] ?? 0;
    total += presses;
    const side = slot.hand;
    hands.overall[side] += presses;
    if (slot.inner) hands.innerColumns[side] += presses;
    if (slot.role === "outer") hands.outerColumns[side] += presses;
    if (slot.role !== "thumb") {
      hands.withoutThumbs[side] += presses;
      nonThumbTotal += presses;
    }
    const finger = fingers[slot.bar]!;
    if (slot.home) {
      finger.home += presses;
      home += presses;
    } else {
      finger.other += presses;
    }
    if (keyMap.symbolOf.get(slot.id) === SPACE) {
      spacePresses += presses;
      if (slot.home) spaceOnHome += presses;
    }
  }

  const share = (split: HandSplit, whole: number): HandSplit => ({ left: ratio(split.left, whole), right: ratio(split.right, whole) });

  let characters = counts.invalid[0];
  for (const count of chars.values()) characters += count;

  const bigramTotal = d.bigramTotal;
  const withoutSpaceTrigrams = t.classified[1] + t.classified[2];
  const allTrigrams = t.classified[0] + withoutSpaceTrigrams;
  const skipgramDenominator = t.skipgramBase[1] + t.skipgramBase[2];

  const cognitiveLoad = [...adapter.usage.values()].reduce((a, b) => a + b, 0);
  const fssRedirect = [...d.fssRedirect.values()].reduce((a, b) => a + b, 0);
  const fssAlternation = [...d.fssAlternation.values()].reduce((a, b) => a + b, 0);

  const usageLabels = (pattern: string) => `${label(pattern)} → ${label(adapter.replacementOf.get(pattern) ?? "")}`;

  const result: AnalysisResult = {
    keyPresses,
    fingers: fingers.map((finger) => ({ home: ratio(finger.home, total), other: ratio(finger.other, total) })),
    hands: {
      innerColumns: share(hands.innerColumns, total),
      outerColumns: share(hands.outerColumns, total),
      withoutThumbs: share(hands.withoutThumbs, nonThumbTotal),
      overall: share(hands.overall, total),
    },
    homeKeys: {
      withSpace: ratio(home, total),
      // Only the space key is left out (question 16 of the specs).
      withoutSpace: ratio(home - spaceOnHome, total - spacePresses),
    },
    pressesChange: ratio(characters, counts.originalPresses) - 1,
    trigrams: {
      all: trigramStats(t, "all"),
      noSpace: trigramStats(t, "noSpace"),
      pad: trigramStats(t, "pad"),
    },
    difficulties: {
      sfb: ratio(sumMap(d.sfb), bigramTotal),
      skb: ratio(sumMap(d.skb), bigramTotal),
      lsb: ratio(sumMap(d.lsb), bigramTotal),
      fsb: ratio(sumMap(d.fsb), bigramTotal),
      hsb: ratio(sumMap(d.hsb), bigramTotal),
      rjb: ratio(sumMap(d.rjb), bigramTotal),
      badRedirects: ratio(sumMap(d.badRedirects), withoutSpaceTrigrams),
      sfs: ratio(t.sfsAlternation[1] / 2 + t.sfsAlternation[2] / 2 + t.sfsRedirect[1] + t.sfsRedirect[2], skipgramDenominator),
      sts: ratio(t.sfsAlternation[0] / 2 + t.sfsRedirect[0], allTrigrams),
      fss: ratio(fssAlternation, skipgramDenominator) / 2 + ratio(fssRedirect, skipgramDenominator),
      cc: ratio(cognitiveLoad, counts.originalPresses),
      shs: ratio(counts.sameHand.score, counts.sameHand.sequences),
    },
    distribution: { distance: d.distance, scissors: d.scissors, stretch: d.stretch },
    lists: {
      sfb: toList(d.sfb, bigramTotal),
      skb: toList(d.skb, bigramTotal),
      lsb: toList(d.lsb, bigramTotal),
      fsb: toList(d.fsb, bigramTotal),
      hsb: toList(d.hsb, bigramTotal),
      rjb: toList(d.rjb, bigramTotal),
      badRedirects: toList(d.badRedirects, withoutSpaceTrigrams),
      sfsRedirect: toList(d.sfsRedirect, allTrigrams),
      sfsAlternation: toList(d.sfsAlternation, allTrigrams),
      fssRedirect: toList(d.fssRedirect, skipgramDenominator),
      fssAlternation: toList(d.fssAlternation, skipgramDenominator),
      cc: toList(adapter.usage, counts.originalPresses, usageLabels),
      shs4: toList(onlyRepeated(counts.sameHand.four), 0),
      shs5: toList(onlyRepeated(counts.sameHand.fiveOrMore), 0),
    },
    totals: { characters, corpusPresses: counts.originalPresses, words: sumMap(counts.words) },
  };

  return {
    result,
    counts,
    keyMap,
    usage: adapter.usage,
    replacementOf: adapter.replacementOf,
    trigramTallies: t,
    difficultyTallies: d,
  };
}

function sumMap(map: Map<string, number>): number {
  let total = 0;
  for (const value of map.values()) total += value;
  return total;
}

/** The Excel analyser lists only the sequences seen more than once. */
function onlyRepeated(map: Map<string, number>): Map<string, number> {
  return new Map([...map].filter(([, count]) => count > 1));
}
