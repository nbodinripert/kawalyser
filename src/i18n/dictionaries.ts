import "server-only";
import type { Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

/**
 * The texts the analyzer needs in the browser. The page hands it only these: the whole dictionary,
 * docs included, would weigh on every visit for nothing.
 */
export const analyzerSections = ["layout", "replacements", "results", "analysis", "csv"] as const;
export type AnalyzerDictionary = Pick<Dictionary, (typeof analyzerSections)[number]>;

// Typing every entry against the English file makes a missing translation a compile error.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((module) => module.default),
  fr: () => import("./dictionaries/fr.json").then((module) => module.default),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
