import { analyse, type AnalysisDetail, type AnalysisInput } from "@/engine/analyse";
import { difficultiesCsv, ngramsCsv } from "@/engine/export";
import type { WorkerRequest, WorkerResponse } from "./local-analysis";

/**
 * Analyses the personal corpus, off the page's thread (see local-analysis.ts). The engine is the server's,
 * unchanged: it reads no file, network or DOM, so it runs here as it is.
 */

type Scope = {
  postMessage(message: WorkerResponse): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerRequest>) => void): void;
};
const scope = self as unknown as Scope;

let corpus: string | null = null;
// The last analysis, so that a download right after it does not compute it again, as the server's cache does.
let last: { key: string; detail: AnalysisDetail } | null = null;

function detailFor(key: string, input: AnalysisInput): AnalysisDetail {
  if (last?.key === key) return last.detail;
  if (corpus === null) throw new Error("No corpus to analyse");
  const detail = analyse(corpus, input);
  last = { key, detail };
  return detail;
}

scope.addEventListener("message", ({ data }) => {
  if (data.type === "corpus") {
    corpus = data.text;
    last = null;
    return;
  }
  try {
    const detail = detailFor(data.key, data.input);
    if (data.type === "analyse") {
      scope.postMessage({ id: data.id, ok: true, result: detail.result });
    } else {
      const csv = data.kind === "ngrams" ? ngramsCsv(detail, data.options) : difficultiesCsv(detail, data.options);
      scope.postMessage({ id: data.id, ok: true, csv });
    }
  } catch (error) {
    scope.postMessage({ id: data.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
