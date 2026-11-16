import type { AnalysisInput, AnalysisResult } from "@/engine/analyse";
import type { CsvOptions } from "@/engine/export";

/**
 * Runs the analysis of the personal corpus in a Web Worker (analysis.worker.ts): the text never leaves the browser
 * (question 28 of the specs), and the page stays usable during the few seconds it takes.
 * The site's corpora are analysed on the server instead, where they stay private.
 */

export type ExportKind = "ngrams" | "difficulties";

/** What the page asks of the worker, about the corpus it holds. */
type Question =
  | { type: "analyse"; key: string; input: AnalysisInput }
  | { type: "export"; key: string; input: AnalysisInput; kind: ExportKind; options: CsvOptions };

export type WorkerRequest = { type: "corpus"; text: string | null } | (Question & { id: number });

export type WorkerResponse =
  | { id: number; ok: true; result: AnalysisResult }
  | { id: number; ok: true; csv: string }
  | { id: number; ok: false; error: string };

export type LocalAnalysis = {
  /** The text to analyse from now on; null forgets it. */
  setCorpus(text: string | null): void;
  analyse(key: string, input: AnalysisInput): Promise<AnalysisResult>;
  exportCsv(key: string, input: AnalysisInput, kind: ExportKind, options: CsvOptions): Promise<string>;
  dispose(): void;
};

type Pending = { resolve: (response: Extract<WorkerResponse, { ok: true }>) => void; reject: (error: Error) => void };

export function createLocalAnalysis(): LocalAnalysis {
  let worker: Worker | null = null;
  // Kept here too, so that a worker started again after a crash gets the text back.
  let corpus: string | null = null;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  const failAll = (error: Error) => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  const start = (): Worker => {
    if (worker) return worker;
    const started = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
    started.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      if (response.ok) request.resolve(response);
      else request.reject(new Error(response.error));
    });
    started.addEventListener("error", () => {
      started.terminate();
      if (worker === started) worker = null;
      failAll(new Error("The analysis worker stopped"));
    });
    if (corpus !== null) started.postMessage({ type: "corpus", text: corpus } satisfies WorkerRequest);
    worker = started;
    return started;
  };

  const ask = (message: Question) =>
    new Promise<Extract<WorkerResponse, { ok: true }>>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      start().postMessage({ ...message, id } satisfies WorkerRequest);
    });

  return {
    setCorpus(text) {
      corpus = text;
      if (worker) worker.postMessage({ type: "corpus", text } satisfies WorkerRequest);
    },
    async analyse(key, input) {
      const response = await ask({ type: "analyse", key, input });
      if (!("result" in response)) throw new Error("No result");
      return response.result;
    },
    async exportCsv(key, input, kind, options) {
      const response = await ask({ type: "export", key, input, kind, options });
      if (!("csv" in response)) throw new Error("No CSV");
      return response.csv;
    },
    dispose() {
      worker?.terminate();
      worker = null;
      failAll(new Error("The analysis was cancelled"));
    },
  };
}
