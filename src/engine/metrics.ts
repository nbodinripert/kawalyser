import { fingerCode, type KeySlot } from "@/domain/geometry";
import { SPACE } from "@/domain/symbols";
import type { CorpusCounts } from "./count";
import type { KeyMap } from "./keymap";

/** Ports of analyse_Trigramme and analyse_Bigramme from the Excel analyser. */

export const trigramScopes = ["all", "noSpace", "pad"] as const;
export type TrigramScope = (typeof trigramScopes)[number];

/** Trigram kinds: 0 contains a space, 1 a thumb key, 2 only finger keys. */
type Kind = 0 | 1 | 2;
type ByKind = [number, number, number];

const zero = (): ByKind => [0, 0, 0];

export type TrigramTallies = {
  classified: ByKind;
  invalid: number;
  /** Trigrams with a doubled letter or a same-finger bigram, left out of the four families. */
  other: number;
  alternation: ByKind;
  rolls: ByKind;
  inwardRolls: ByKind;
  outwardRolls: ByKind;
  oneHand: ByKind;
  inwardOneHand: ByKind;
  outwardOneHand: ByKind;
  redirects: ByKind;
  sfsAlternation: ByKind;
  sfsRedirect: ByKind;
  /** Trigrams by the kind of their outer letters, as used for skipgram rates. */
  skipgramBase: ByKind;
};

export type Entry = { gram: string; count: number };

export type DifficultyTallies = {
  bigramTotal: number;
  sfb: Map<string, number>;
  skb: Map<string, number>;
  lsb: Map<string, number>;
  fsb: Map<string, number>;
  hsb: Map<string, number>;
  rjb: Map<string, number>;
  badRedirects: Map<string, number>;
  sfsRedirect: Map<string, number>;
  sfsAlternation: Map<string, number>;
  fssRedirect: Map<string, number>;
  fssAlternation: Map<string, number>;
  /** Weighted scores per finger bar, for the difficulty distribution chart. */
  distance: number[];
  scissors: number[];
  stretch: number[];
};

const add = (map: Map<string, number>, key: string, count: number) => map.set(key, (map.get(key) ?? 0) + count);

function sameHand(a: KeySlot, b: KeySlot): boolean {
  return a.col < 7 === b.col < 7;
}

function code(slot: KeySlot): number {
  return fingerCode[slot.finger];
}

function isSfb(a: KeySlot, b: KeySlot): boolean {
  return code(a) === code(b) && sameHand(a, b);
}

/** Moving towards the thumb. */
function inward(a: KeySlot, b: KeySlot): boolean {
  return code(a) > code(b);
}

function isThumb(slot: KeySlot): boolean {
  return slot.finger === "thumb";
}

function isLsb(a: KeySlot, b: KeySlot): boolean {
  if (isThumb(a) || isThumb(b)) return false;
  const fingerGap = Math.abs(code(a) - code(b));
  const columnGap = Math.abs(a.col - b.col);
  return (fingerGap === 1 && columnGap === 2) || (fingerGap === 2 && columnGap === 3 && a.row !== b.row);
}

/**
 * Port of isScissors: how many rows apart two fingers fold the wrong way, 0 if they do not.
 * The last rule (middle finger on top, ring finger two rows below) never fires in the Excel analyser:
 * VBA compares a text with a number there, which is always false. The compat mode reproduces that.
 */
function scissors(a: KeySlot, b: KeySlot, compat: boolean): number {
  if (isThumb(a) || isThumb(b)) return 0;
  if (a.row > b.row) {
    if (a.finger === "middle" && b.finger !== "middle") return a.row - b.row;
    if (a.finger === "ring" && (b.finger === "index" || b.finger === "pinky")) return a.row - b.row;
    return 0;
  }
  if (a.finger === "ring" && a.row === 1 && b.finger === "pinky") return b.row - a.row;
  if (!compat && b.row === a.row + 2 && a.finger === "middle" && b.finger === "ring") return 2;
  return 0;
}

function distanceSquared(a: KeySlot, b: KeySlot): number {
  return (a.row - b.row) ** 2 + (a.col - b.col) ** 2;
}

function thumbOrIndex(slot: KeySlot): boolean {
  return slot.finger === "thumb" || slot.finger === "index";
}

export function tallyTrigrams(counts: CorpusCounts, keyMap: KeyMap, difficulties: DifficultyTallies, compat = false): TrigramTallies {
  const t: TrigramTallies = {
    classified: zero(),
    invalid: counts.invalid[2],
    other: 0,
    alternation: zero(),
    rolls: zero(),
    inwardRolls: zero(),
    outwardRolls: zero(),
    oneHand: zero(),
    inwardOneHand: zero(),
    outwardOneHand: zero(),
    redirects: zero(),
    sfsAlternation: zero(),
    sfsRedirect: zero(),
    skipgramBase: zero(),
  };
  const slotOf = keyMap.slotOf;

  for (const [gram, count] of counts.ngrams[2]) {
    const c1 = gram.charAt(0);
    const c2 = gram.charAt(1);
    const c3 = gram.charAt(2);
    const k1 = slotOf.get(c1)!;
    const k2 = slotOf.get(c2)!;
    const k3 = slotOf.get(c3)!;

    if (c1 === c2 || c2 === c3 || isSfb(k1, k2) || isSfb(k2, k3)) {
      t.other += count;
      continue;
    }

    // A real space makes a "spacegram"; the space key typed after the dead key counts as a thumb key.
    const skipKind: Kind = c1 === SPACE || c3 === SPACE ? 0 : isThumb(k1) || isThumb(k3) ? 1 : 2;
    t.skipgramBase[skipKind] += count;
    const kind: Kind = skipKind === 0 || c2 === SPACE ? 0 : skipKind === 1 || isThumb(k2) ? 1 : 2;
    t.classified[kind] += count;

    const skipgram = `${c1}_${c3}`;

    if (sameHand(k1, k2)) {
      if (sameHand(k2, k3)) {
        const in12 = inward(k1, k2);
        const in23 = inward(k2, k3);
        if (in12 && in23) {
          t.oneHand[kind] += count;
          t.inwardOneHand[kind] += count;
        } else if (!in12 && !in23) {
          t.oneHand[kind] += count;
          t.outwardOneHand[kind] += count;
        } else {
          t.redirects[kind] += count;
          if (!thumbOrIndex(k1) && !thumbOrIndex(k2) && !thumbOrIndex(k3)) {
            add(difficulties.badRedirects, gram, count);
            difficulties.stretch[k3.bar]! += 2 * count;
          }
          if (c1 !== c3) {
            const fold = scissors(k1, k3, compat) + scissors(k3, k1, compat);
            if (isSfb(k1, k3)) {
              difficulties.distance[k1.bar]! += 0.5 * count * distanceSquared(k1, k3);
              add(difficulties.sfsRedirect, skipgram, count);
              t.sfsRedirect[skipKind] += count;
            } else if (fold > 1) {
              difficulties.scissors[k3.bar]! += 2 * count;
              add(difficulties.fssRedirect, skipgram, count);
            }
          }
        }
      } else {
        t.rolls[kind] += count;
        if (inward(k1, k2)) t.inwardRolls[kind] += count;
        else t.outwardRolls[kind] += count;
      }
    } else if (sameHand(k2, k3)) {
      t.rolls[kind] += count;
      if (inward(k2, k3)) t.inwardRolls[kind] += count;
      else t.outwardRolls[kind] += count;
    } else {
      t.alternation[kind] += count;
      if (c1 !== c3) {
        const fold = scissors(k1, k3, compat) + scissors(k3, k1, compat);
        if (isSfb(k1, k3)) {
          difficulties.distance[k1.bar]! += 0.25 * count * distanceSquared(k1, k3);
          add(difficulties.sfsAlternation, skipgram, count);
          t.sfsAlternation[skipKind] += count;
        } else if (fold > 1) {
          difficulties.scissors[k3.bar]! += count;
          add(difficulties.fssAlternation, skipgram, count);
        }
      }
    }
  }

  return t;
}

export function emptyDifficulties(): DifficultyTallies {
  return {
    bigramTotal: 0,
    sfb: new Map(),
    skb: new Map(),
    lsb: new Map(),
    fsb: new Map(),
    hsb: new Map(),
    rjb: new Map(),
    badRedirects: new Map(),
    sfsRedirect: new Map(),
    sfsAlternation: new Map(),
    fssRedirect: new Map(),
    fssAlternation: new Map(),
    distance: Array(10).fill(0),
    scissors: Array(10).fill(0),
    stretch: Array(10).fill(0),
  };
}

export function tallyBigrams(counts: CorpusCounts, keyMap: KeyMap, d: DifficultyTallies, compat = false): void {
  // As in the Excel analyser, invalid bigrams count in the total (question 17 of the specs).
  d.bigramTotal = counts.invalid[1];

  for (const [gram, count] of counts.ngrams[1]) {
    const c1 = gram.charAt(0);
    const c2 = gram.charAt(1);
    if (c1 === SPACE || c2 === SPACE) continue;
    d.bigramTotal += count;

    const k1 = keyMap.slotOf.get(c1)!;
    const k2 = keyMap.slotOf.get(c2)!;
    if (!sameHand(k1, k2)) continue;

    if (c1 === c2) {
      d.distance[k2.bar]! += 0.25 * count;
      add(d.skb, gram, count);
      continue;
    }
    if (isSfb(k1, k2)) {
      d.distance[k1.bar]! += count * distanceSquared(k1, k2);
      add(d.sfb, gram, count);
      continue;
    }
    if (isLsb(k1, k2)) {
      d.stretch[k2.bar]! += 0.5 * count;
      add(d.lsb, gram, count);
    }
    if (isThumb(k1) || isThumb(k2)) continue;
    const fold = scissors(k1, k2, compat) + scissors(k2, k1, compat);
    if (fold > 1) {
      d.scissors[k2.bar]! += 4 * count;
      add(d.fsb, gram, count);
    } else if (fold === 1) {
      d.scissors[k2.bar]! += 0.5 * count;
      add(d.hsb, gram, count);
    } else if (Math.abs(k1.row - k2.row) === 2) {
      d.scissors[k2.bar]! += count;
      add(d.rjb, gram, count);
    }
  }
}
