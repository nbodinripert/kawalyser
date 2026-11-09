import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CorpusLanguage } from "@/domain/valid-chars";

/**
 * The corpora stay private: they are never sent to the browser and are not in the public repository.
 * In production they come from a private GitHub repository; locally, from the git-ignored corpus/ folder.
 */
const fileNames: Record<CorpusLanguage, string> = { fr: "fr.txt", en: "en.txt" };

const cache = new Map<CorpusLanguage, Promise<string>>();

async function fromGitHub(repository: string, token: string, path: string): Promise<string> {
  const ref = process.env.CORPUS_GITHUB_REF;
  const url = `https://api.github.com/repos/${repository}/contents/${encodeURI(path)}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Corpus download failed (${response.status}) for ${path}`);
  return response.text();
}

async function read(language: CorpusLanguage): Promise<string> {
  const fileName = fileNames[language];
  const repository = process.env.CORPUS_GITHUB_REPO;
  const token = process.env.CORPUS_GITHUB_TOKEN;
  if (repository && token) {
    const folder = process.env.CORPUS_GITHUB_DIR ?? "";
    return fromGitHub(repository, token, folder ? `${folder}/${fileName}` : fileName);
  }
  // Local development only: kept out of the build's file tracing, so the corpus folder is never deployed.
  const directory = process.env.CORPUS_DIR ?? join(/*turbopackIgnore: true*/ process.cwd(), "corpus");
  const path = join(/*turbopackIgnore: true*/ directory, fileName);
  return readFile(/*turbopackIgnore: true*/ path, "utf8");
}

export function loadCorpus(language: CorpusLanguage): Promise<string> {
  let pending = cache.get(language);
  if (!pending) {
    pending = read(language);
    // A failed download must not stay cached.
    pending.catch(() => cache.delete(language));
    cache.set(language, pending);
  }
  return pending;
}
