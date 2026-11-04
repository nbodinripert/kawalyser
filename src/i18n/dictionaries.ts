import "server-only";
import type { Locale } from "./config";
import type en from "./dictionaries/en.json";

export type Dictionary = typeof en;

// Typing every entry against the English file makes a missing translation a compile error.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((module) => module.default),
  fr: () => import("./dictionaries/fr.json").then((module) => module.default),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
