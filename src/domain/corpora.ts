/** The corpora the site provides. They stay on the server: only their identifiers reach the browser. */
export const corpusLanguages = ["fr", "en"] as const;
export type CorpusLanguage = (typeof corpusLanguages)[number];
