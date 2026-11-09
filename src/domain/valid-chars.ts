import { DEAD_KEY } from "./symbols";

export const corpusLanguages = ["fr", "en"] as const;
export type CorpusLanguage = (typeof corpusLanguages)[number];

// Kawamashi's lists, by decreasing frequency. "&" stands for the dead key in the Excel analyser.
const rawLists: Record<CorpusLanguage, string> = {
  fr: "esaitnrouldcpméqv&.f,gjhxwy-è'bàçêkzôûîâ…ïœ@æ:!?",
  en: "etaionsrhdlm&uycwgpf.v,jx-qéèbk'z…@çâïàæ:!?",
};

export const validChars: Record<CorpusLanguage, ReadonlySet<string>> = {
  fr: new Set(Array.from(rawLists.fr.replaceAll("&", DEAD_KEY))),
  en: new Set(Array.from(rawLists.en.replaceAll("&", DEAD_KEY))),
};

/** Valid means listed for this language, ignoring case. */
export function isValidChar(char: string, language: CorpusLanguage): boolean {
  return validChars[language].has(char.toLowerCase());
}

export function isCorpusLanguage(value: string): value is CorpusLanguage {
  return (corpusLanguages as readonly string[]).includes(value);
}
