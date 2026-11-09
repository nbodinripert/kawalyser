"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import { z } from "zod";
import { findBlockingDuplicates } from "@/domain/duplicates";
import { shapeIds } from "@/domain/geometry";
import { importKalamine, type ImportProblem } from "@/domain/kalamine";
import type { Layout } from "@/domain/layout";
import { analysisLevels, emptyReplacements, parseReplacements, replacementsSchema } from "@/domain/replacements";
import { analysisRequestSchema, layoutSchema, type AnalysisRequest } from "@/domain/schemas";
import { corpusLanguages } from "@/domain/valid-chars";
import type { AnalysisResult } from "@/engine/analyse";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Button, Card, Select, cx, format } from "../ui";
import { KeyboardMap } from "./keyboard-map";
import { formatters } from "./numbers";
import { ReplacementsPanel } from "./replacements-panel";
import { Results } from "./results";
import { initialState, reducer, storageKey, toSaved, type SavedState } from "./state";

type AnalyzerProps = { dictionary: Dictionary; locale: Locale; defaultLayout: Layout };

const savedSchema = z.object({
  layout: layoutSchema,
  imported: layoutSchema,
  replacements: replacementsSchema,
  replacementsName: z.string().nullable(),
  level: z.enum(analysisLevels),
  language: z.enum(corpusLanguages),
});

function readSaved(): SavedState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as SavedState) : null;
  } catch {
    return null;
  }
}

function writeSaved(saved: SavedState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(saved));
  } catch {
    // Storage can be full or blocked; the session still works.
  }
}

function importProblemText(problem: ImportProblem, labels: Dictionary["layout"]["errors"]): string {
  switch (problem.kind) {
    case "unreadable":
      return format(labels.unreadable, { detail: problem.detail });
    case "no-layer":
      return labels.noLayer;
    case "unknown-geometry":
      return format(labels.unknownGeometry, { geometry: problem.geometry });
  }
}

async function readFile(event: ChangeEvent<HTMLInputElement>): Promise<{ name: string; text: string } | null> {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return null;
  return { name: file.name, text: await file.text() };
}

export function Analyzer({ dictionary, locale, defaultLayout }: AnalyzerProps) {
  const [state, dispatch] = useReducer(reducer, defaultLayout, initialState);
  const [downloading, setDownloading] = useState<"ngrams" | "difficulties" | null>(null);
  const tomlInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const numbers = useMemo(() => formatters(locale), [locale]);
  const labels = dictionary.layout;

  // The saved session is read after hydration, since the server cannot see it.
  useEffect(() => {
    dispatch({ type: "restore", saved: readSaved() });
  }, []);

  useEffect(() => {
    if (state.hydrated) writeSaved(toSaved(state));
  }, [state]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea")) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const request: AnalysisRequest = {
    layout: state.layout,
    replacements: state.replacements,
    level: state.level,
    language: state.language,
  };

  const onImportToml = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = await readFile(event);
    if (!file) return;
    const imported = importKalamine(file.text, state.layout.shapeId);
    if (!imported.ok) {
      dispatch({ type: "notice", notice: { tone: "error", text: importProblemText(imported.problem, labels.errors) } });
      return;
    }
    const duplicates = findBlockingDuplicates(imported.layout);
    if (duplicates.length > 0) {
      const chars = [...new Set(duplicates.map((d) => d.char))].join(" ");
      dispatch({ type: "notice", notice: { tone: "error", text: format(labels.errors.duplicates, { chars }) } });
      return;
    }
    const name = imported.layout.name || file.name.replace(/\.toml$/i, "");
    const messages = [format(labels.imported, { name })];
    if (imported.droppedReserved.length > 0) messages.push(format(labels.droppedReserved, { chars: imported.droppedReserved.join(" ") }));
    dispatch({ type: "importLayout", layout: { ...imported.layout, name }, notice: { tone: "info", text: messages.join(" ") } });
  };

  const onImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = await readFile(event);
    if (!file) return;
    const parsed = parseReplacements(file.text);
    if (!parsed.ok) {
      dispatch({ type: "notice", notice: { tone: "error", text: format(labels.errors.replacements, { detail: parsed.detail }) } });
      return;
    }
    dispatch({ type: "setReplacements", replacements: parsed.replacements, name: file.name, notice: null });
  };

  const runAnalysis = async () => {
    const body = analysisRequestSchema.parse(request);
    dispatch({ type: "analysisStarted" });
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(String(response.status));
      dispatch({ type: "analysisSucceeded", result: (await response.json()) as AnalysisResult });
    } catch {
      dispatch({ type: "analysisFailed" });
    }
  };

  const download = async (kind: "ngrams" | "difficulties") => {
    setDownloading(kind);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, locale, analysis: request }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `kawalyser-${kind}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      dispatch({ type: "notice", notice: { tone: "error", text: dictionary.analysis.downloadFailed } });
    } finally {
      setDownloading(null);
    }
  };

  const running = state.status === "running";

  return (
    <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
      <Card
        title={
          <span className="flex items-baseline gap-2">
            {labels.title}
            {state.layout.name && <span className="text-sm font-normal text-muted">{state.layout.name}</span>}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input ref={tomlInput} type="file" accept=".toml,text/plain" className="hidden" onChange={onImportToml} />
            <input ref={jsonInput} type="file" accept=".json,application/json" className="hidden" onChange={onImportJson} />
            <Button onClick={() => tomlInput.current?.click()}>{labels.importToml}</Button>
            <Button onClick={() => jsonInput.current?.click()}>{labels.importReplacements}</Button>
            {state.replacementsName && (
              <Button variant="ghost" onClick={() => dispatch({ type: "setReplacements", replacements: emptyReplacements, name: null, notice: null })}>
                {labels.removeReplacements}
              </Button>
            )}
          </div>
        }
      >
        {state.notice && (
          <p
            role={state.notice.tone === "error" ? "alert" : "status"}
            className={cx(
              "mb-4 rounded-lg px-3 py-2 text-sm",
              state.notice.tone === "error" ? "bg-danger-soft text-danger" : "bg-accent-soft text-foreground",
            )}
          >
            {state.notice.text}
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Select label={labels.shape} value={state.layout.shapeId} onChange={(event) => dispatch({ type: "setShape", shapeId: event.target.value as (typeof shapeIds)[number] })}>
            {shapeIds.map((id) => (
              <option key={id} value={id}>
                {labels.shapes[id]}
              </option>
            ))}
          </Select>
          <Select label={labels.corpus} value={state.language} onChange={(event) => dispatch({ type: "setLanguage", language: event.target.value as (typeof corpusLanguages)[number] })}>
            {corpusLanguages.map((id) => (
              <option key={id} value={id}>
                {labels.corpora[id]}
              </option>
            ))}
          </Select>
          <Select label={labels.level} value={state.level} onChange={(event) => dispatch({ type: "setLevel", level: event.target.value as (typeof analysisLevels)[number] })}>
            {analysisLevels.map((id) => (
              <option key={id} value={id}>
                {labels.levels[id]}
              </option>
            ))}
          </Select>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" onClick={() => dispatch({ type: "undo" })} disabled={state.past.length === 0}>
              {labels.undo}
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: "redo" })} disabled={state.future.length === 0}>
              {labels.redo}
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: "reset" })} disabled={state.layout === state.imported}>
              {labels.reset}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0">
            <KeyboardMap
              layout={state.layout}
              language={state.language}
              keyPresses={state.result?.keyPresses ?? null}
              labels={labels}
              onChange={(layout) => dispatch({ type: "edit", layout })}
            />
          </div>
          <ReplacementsPanel replacements={state.replacements} name={state.replacementsName} labels={dictionary.replacements} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <Button variant="primary" onClick={runAnalysis} disabled={running} aria-busy={running}>
            {running && <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {running ? dictionary.analysis.running : dictionary.analysis.run}
          </Button>
          <Button onClick={() => download("ngrams")} disabled={!state.result || downloading !== null} aria-busy={downloading === "ngrams"}>
            {dictionary.analysis.downloadNgrams}
          </Button>
          <Button onClick={() => download("difficulties")} disabled={!state.result || downloading !== null} aria-busy={downloading === "difficulties"}>
            {dictionary.analysis.downloadDifficulties}
          </Button>
        </div>
      </Card>

      <div aria-live="polite">
        {state.status === "failed" && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {dictionary.analysis.failed}
          </p>
        )}
        {state.result ? (
          <div className={cx("transition-opacity", running && "opacity-50")}>
            <Results result={state.result} dictionary={dictionary} numbers={numbers} />
          </div>
        ) : (
          state.status !== "failed" && (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
              {state.cleared ? dictionary.analysis.cleared : dictionary.analysis.empty}
            </div>
          )
        )}
      </div>
    </div>
  );
}
