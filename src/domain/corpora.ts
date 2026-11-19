/** The corpora the site provides. They stay on the server: only their identifiers reach the browser. */
export const corpusLanguages = ["fr", "en"] as const;
export type CorpusLanguage = (typeof corpusLanguages)[number];

/** The corpus the user imports, analysed in the browser: it never reaches the server (question 28 of the specs). */
export const PERSONAL_CORPUS = "personal";

/** What the "Corpus" list can select. */
export type CorpusId = CorpusLanguage | typeof PERSONAL_CORPUS;
