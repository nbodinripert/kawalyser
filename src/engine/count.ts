import type { Adapter } from "./adapt";
import type { KeyMap } from "./keymap";

export type CorpusCounts = {
  /** Original words with their counts, and what each one becomes once typed. */
  words: Map<string, number>;
  typedWords: Map<string, string>;
  /** Index 0 holds characters, 1 bigrams, 2 trigrams, 3 quadrigrams. */
  ngrams: [Map<string, number>, Map<string, number>, Map<string, number>, Map<string, number>];
  invalid: [number, number, number, number];
  /** Characters of the cleaned corpus, before any replacement. */
  originalChars: Map<string, number>;
  /** Key presses needed without the layout's tricks: circumflexes and diaereses count twice. */
  originalPresses: number;
  sameHand: { score: number; sequences: number; four: Map<string, number>; fiveOrMore: Map<string, number> };
};

const twoPressChars = new Set(Array.from("âêîôûï"));

export function countCorpus(text: string, keyMap: KeyMap, adapter: Adapter): CorpusCounts {
  const counts: CorpusCounts = {
    words: new Map(),
    typedWords: new Map(),
    ngrams: [new Map(), new Map(), new Map(), new Map()],
    invalid: [0, 0, 0, 0],
    originalChars: new Map(),
    originalPresses: 0,
    sameHand: { score: 0, sequences: 0, four: new Map(), fiveOrMore: new Map() },
  };
  const valid = keyMap.slotOf;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line === "") continue;

    const { cleaned, words, adapted } = adapter.adaptLine(line);

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned.charAt(i);
      counts.originalChars.set(char, (counts.originalChars.get(char) ?? 0) + 1);
      counts.originalPresses += twoPressChars.has(char) ? 2 : 1;
    }

    words.forEach((word, index) => {
      counts.words.set(word, (counts.words.get(word) ?? 0) + 1);
      if (!counts.typedWords.has(word)) counts.typedWords.set(word, adapted[index] ?? word);
    });

    const phrase = adapted.join(" ");
    for (let start = 0; start < phrase.length; start++) {
      for (let size = 1; size <= 4 && start + size <= phrase.length; size++) {
        const gram = phrase.slice(start, start + size);
        let ok = true;
        for (let k = 0; k < size; k++) {
          if (!valid.has(gram.charAt(k))) {
            ok = false;
            break;
          }
        }
        const index = size - 1;
        if (!ok) {
          counts.invalid[index as 0 | 1 | 2 | 3]++;
          continue;
        }
        const map = counts.ngrams[index as 0 | 1 | 2 | 3];
        map.set(gram, (map.get(gram) ?? 0) + 1);
      }
    }

    countSameHandSequences(phrase, keyMap, counts.sameHand);
  }

  return counts;
}

/**
 * Port of rempl_Dico_SHS: sequences of four or more key presses on one hand, inside a word.
 * A sequence of n presses scores 2^(n-4), from its second occurrence on.
 */
function countSameHandSequences(phrase: string, keyMap: KeyMap, result: CorpusCounts["sameHand"]) {
  let sequence = "";
  let leftHand = false;
  let wordLength = 0;

  const remember = (value: string) => {
    const bucket = value.length > 4 ? result.fiveOrMore : result.four;
    const seen = bucket.get(value);
    if (seen === undefined) {
      bucket.set(value, 1);
    } else {
      bucket.set(value, seen + 1);
      result.score += 2 ** (value.length - 4);
    }
  };

  for (let i = 0; i < phrase.length; i++) {
    const char = phrase.charAt(i);
    const slot = char === " " ? undefined : keyMap.slotOf.get(char);

    if (slot) {
      const isLeft = slot.col < 7;
      if (sequence === "") {
        leftHand = isLeft;
        sequence = char;
        wordLength = 1;
      } else if (isLeft === leftHand) {
        sequence += char;
        wordLength++;
      } else {
        if (sequence.length > 3) remember(sequence);
        sequence = char;
        wordLength++;
        leftHand = isLeft;
      }
    } else {
      if (sequence.length > 3) remember(sequence);
      if (wordLength > 3) result.sequences += wordLength - 3;
      sequence = "";
    }
  }
}
