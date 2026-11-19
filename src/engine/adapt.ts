import type { AnalysisLevel, Replacements } from "@/domain/replacements";
import { canType, DK, DK_SPACE, keysToTokens, MAGIC, REPEAT, type KeyMap } from "./keymap";

/**
 * Turns the corpus into what is really typed, word by word, as the Excel analyser does:
 * optional corrections (Clever Keys) first, then the dead key strings, Repeat and essential corrections,
 * then the dead key layer. Repeat does not depend on the level: it follows the key being on the map.
 */

type Rule = {
  pattern: string;
  replacement: string;
  check?: (word: string, position: number) => boolean;
};

export type AdaptOptions = {
  level: AnalysisLevel;
  /** Reproduces the Excel analyser exactly, including the behaviours the specs correct. */
  compat?: boolean;
};

export type Adapter = {
  adaptLine(line: string): { cleaned: string; words: string[]; adapted: string[] };
  /** How many times each rule was applied: the cognitive load. */
  usage: Map<string, number>;
  replacementOf: Map<string, string>;
};

/**
 * The Excel analyser removes "$", "£", "€" and "&", which stood for its special keys. On the site, "*", "$" and "#"
 * stand for them and cannot be real characters of the map, while "£", "€" and "&" can now be placed and typed
 * (question 32 of the specs). Private-use characters no longer need removing: the codec keeps them apart.
 */
const strippedChars = { current: /[*$#]/g, compat: /[$£€&]/g };

/** No-break spaces, the narrow one of French typography included, and tabs are typed with the space bar (question 33). */
const spaceLikeChars = /[\u00a0\u2007\u202f\t]/g;

/** Repeat repeats a character, not a special key nor the space. */
const notRepeatable = new Set([DK, REPEAT, MAGIC, DK_SPACE, " "]);

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
  const { level, compat = false } = options;
  const { codec } = keyMap;
  const isLetter = compat ? isLetterExcel : isLetterUnicode;
  const usage = new Map<string, number>();
  const replacementOf = new Map<string, string>();

  const register = (rule: Rule) => {
    if (!replacementOf.has(rule.pattern)) replacementOf.set(rule.pattern, rule.replacement);
    return rule;
  };

  // The Excel analyser applies every rule. Now a rule that needs a key missing from the map is ignored, since it cannot
  // be typed (feedback on untypeable rules): applied, its key presses fell out of the statistics.
  const typeable = (rule: { keys: string }) => compat || canType(keyMap, rule.keys);

  const cleverRules: Rule[] =
    level === "clever"
      ? replacements.optionalCorrections.filter(typeable).map((rule) =>
          register({
            pattern: codec.encode(rule.text),
            replacement: keysToTokens(codec.encode(rule.keys)),
            // As in the Excel analyser, a one-character Clever Key ignores its conditions.
            check: rule.text.length < 2 ? undefined : boundaryCheck(
              isLetter,
              { active: rule.noLetterBefore === true || (rule.allowedBefore?.length ?? 0) > 0, allowed: rule.allowedBefore ?? [] },
              { active: rule.noLetterAfter === true || (rule.allowedAfter?.length ?? 0) > 0, allowed: rule.allowedAfter ?? [] },
              codec.encode(rule.text).length,
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

  // Repeat: the Excel analyser applies it from the "corrections" level, to "aa" to "zz", even without the key.
  // Now the key alone decides (feedback on Repeat): placed on the map, it serves at every level, for every doubled
  // character typed with one key press, punctuation included (question 26 of the specs). Repeat repeats the last press,
  // so after "*o" it types "o", not "ô": a character of the dead key layer, or one missing from the map, is left as it is.
  // A firmware can be taught to repeat the dead key character, but Kawamashi finds these doubles rare enough to keep
  // the plain behaviour.
  const repeatable = compat
    ? Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i))
    : keyMap.slotOf.has(REPEAT)
      ? [...keyMap.slotOf.keys()].filter((symbol) => !notRepeatable.has(symbol))
      : [];
  const repeatRules = repeatable.map((char) => register({ pattern: char + char, replacement: char + REPEAT }));

  const correctionRules: Rule[] = [];
  if (level !== "raw") correctionRules.push(...multiDeadKeyRules);
  if (!compat || level !== "raw") correctionRules.push(...repeatRules);
  if (level !== "raw") {
    for (const rule of replacements.essentialCorrections.filter(typeable)) {
      correctionRules.push(register({ pattern: codec.encode(rule.text), replacement: keysToTokens(codec.encode(rule.keys)) }));
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
      let cleaned = compat
        ? line.toLowerCase().replaceAll("’", "'").replace(strippedChars.compat, "")
        : codec.encode(
            // NFC: a letter saved with a separate combining accent becomes one character again.
            line.normalize("NFC").toLowerCase().replaceAll("’", "'").replace(spaceLikeChars, " ").replace(strippedChars.current, ""),
          );
      const original = cleaned;
      if (ellipsisOnMap) cleaned = cleaned.replaceAll("...", "…");

      const words = cleaned.split(" ");
      const adapted = words.map((word) => apply(apply(apply(word, cleverRules), correctionRules), singleDeadKeyRules));
      return { cleaned: original, words, adapted };
    },
  };
}
