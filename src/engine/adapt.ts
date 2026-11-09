import type { AnalysisLevel, Replacements } from "@/domain/replacements";
import { validChars, type CorpusLanguage } from "@/domain/valid-chars";
import { DEAD_KEY } from "@/domain/symbols";
import { keysToTokens, REPEAT, type KeyMap } from "./keymap";

/**
 * Turns the corpus into what is really typed, word by word, as the Excel analyser does:
 * Clever Keys first, then the dead key strings, Repeat and essential corrections, then the dead key layer.
 */

type Rule = {
  pattern: string;
  replacement: string;
  check?: (word: string, position: number) => boolean;
};

export type AdaptOptions = {
  level: AnalysisLevel;
  language: CorpusLanguage;
  /** Reproduces the Excel analyser exactly, including the behaviours the specs correct. */
  compat?: boolean;
};

export type Adapter = {
  adaptLine(line: string): { cleaned: string; words: string[]; adapted: string[] };
  /** How many times each rule was applied: the cognitive load. */
  usage: Map<string, number>;
  replacementOf: Map<string, string>;
};

const strippedChars = { current: /[#$£€&-]/g, compat: /[$£€&]/g };

function isLetterExcel(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code > 96 && code < 123) || char === "é";
}

function isLetterUnicode(char: string): boolean {
  return /\p{L}/u.test(char);
}

function boundaryCheck(
  isLetter: (char: string) => boolean,
  before: { active: boolean; allowed: string[] },
  after: { active: boolean; allowed: string[] },
  length: number,
) {
  const allows = (symbol: string, allowed: string[]) => symbol === "" || allowed.includes(symbol) || !isLetter(symbol);
  return (word: string, position: number) => {
    if (before.active && position > 0 && !allows(word.charAt(position - 1), before.allowed)) return false;
    if (after.active && !allows(word.charAt(position + length), after.allowed)) return false;
    return true;
  };
}

export function createAdapter(keyMap: KeyMap, replacements: Replacements, options: AdaptOptions): Adapter {
  const { level, language, compat = false } = options;
  const isLetter = compat ? isLetterExcel : isLetterUnicode;
  const usage = new Map<string, number>();
  const replacementOf = new Map<string, string>();

  const register = (rule: Rule) => {
    if (!replacementOf.has(rule.pattern)) replacementOf.set(rule.pattern, rule.replacement);
    return rule;
  };

  const cleverRules: Rule[] =
    level === "clever"
      ? replacements.cleverKeys.map((rule) =>
          register({
            pattern: rule.text,
            replacement: keysToTokens(rule.keys),
            // As in the Excel analyser, a one-character Clever Key ignores its conditions.
            check: rule.text.length < 2 ? undefined : boundaryCheck(
              isLetter,
              { active: rule.noLetterBefore === true || (rule.allowedBefore?.length ?? 0) > 0, allowed: rule.allowedBefore ?? [] },
              { active: rule.noLetterAfter === true || (rule.allowedAfter?.length ?? 0) > 0, allowed: rule.allowedAfter ?? [] },
              rule.text.length,
            ),
          }),
        )
      : [];

  const singleDeadKeyRules: Rule[] = [];
  const multiDeadKeyRules: Rule[] = [];
  for (const [char, sequence] of keyMap.deadKeySequences) {
    const rule = register({ pattern: char, replacement: sequence });
    if (char.length > 1) multiDeadKeyRules.push(rule);
    else singleDeadKeyRules.push(rule);
  }

  const correctionRules: Rule[] = [];
  if (level !== "raw") {
    correctionRules.push(...multiDeadKeyRules);

    // Repeat: in the Excel analyser, "aa" to "zz" even without the key; now every valid character, if the key is placed.
    const repeatable = compat
      ? Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i))
      : keyMap.slotOf.has(REPEAT)
        ? [...validChars[language]].filter((char) => char !== DEAD_KEY)
        : [];
    for (const char of repeatable) correctionRules.push(register({ pattern: char + char, replacement: char + REPEAT }));

    for (const rule of replacements.corrections) {
      correctionRules.push(register({ pattern: rule.text, replacement: keysToTokens(rule.keys) }));
    }
  }

  const apply = (word: string, rules: Rule[]) => {
    let result = word;
    for (const rule of rules) {
      let position = result.indexOf(rule.pattern);
      while (position !== -1) {
        if (!rule.check || rule.check(result, position)) {
          result = result.slice(0, position) + rule.replacement + result.slice(position + rule.pattern.length);
          usage.set(rule.pattern, (usage.get(rule.pattern) ?? 0) + 1);
        }
        position = result.indexOf(rule.pattern, position + 1);
      }
    }
    return result;
  };

  const ellipsisOnMap = compat ? keyMap.deadKeySequences.has("…") : keyMap.deadKeySequences.has("…") || keyMap.slotOf.has("…");

  return {
    usage,
    replacementOf,
    adaptLine(line: string) {
      let cleaned = line.toLowerCase().replaceAll("’", "'").replace(compat ? strippedChars.compat : strippedChars.current, "");
      const original = cleaned;
      if (ellipsisOnMap) cleaned = cleaned.replaceAll("...", "…");

      const words = cleaned.split(" ");
      const adapted = words.map((word) => apply(apply(apply(word, cleverRules), correctionRules), singleDeadKeyRules));
      return { cleaned: original, words, adapted };
    },
  };
}
