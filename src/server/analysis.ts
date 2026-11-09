import "server-only";
import type { AnalysisRequest } from "@/domain/schemas";
import { analyse, type AnalysisDetail } from "@/engine/analyse";
import { loadCorpus } from "./corpus";

/**
 * Keeps the last few detailed analyses, so that a download right after an analysis
 * does not recompute it. Each entry holds every n-gram of a corpus, so the cache stays small.
 */
const recent = new Map<string, AnalysisDetail>();
const MAX_ENTRIES = 3;

export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisDetail> {
  const key = JSON.stringify(request);
  const cached = recent.get(key);
  if (cached) {
    recent.delete(key);
    recent.set(key, cached);
    return cached;
  }

  const corpus = await loadCorpus(request.language);
  const detail = analyse(corpus, request);

  recent.set(key, detail);
  while (recent.size > MAX_ENTRIES) {
    const oldest = recent.keys().next().value;
    if (oldest === undefined) break;
    recent.delete(oldest);
  }
  return detail;
}
