"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import { z } from "zod";
import { findBlockingDuplicates } from "@/domain/duplicates";
import { shapeIds } from "@/domain/geometry";
import { importKalamine, type ImportProblem } from "@/domain/kalamine";
import { completeLayoutPairs, sameLayout } from "@/domain/layout";
import type { Preset } from "@/domain/presets";
import { analysisLevels, emptyReplacements, parseReplacements, replacementsSchema } from "@/domain/replacements";
import { analysisRequestSchema, layoutSchema, type AnalysisRequest } from "@/domain/schemas";
import { corpusLanguages, PERSONAL_CORPUS, type CorpusId, type CorpusLanguage } from "@/domain/corpora";
import { decodeCorpus, MAX_CORPUS_BYTES } from "@/domain/corpus-file";
import type { AnalysisResult } from "@/engine/analyse";
import type { Locale } from "@/i18n/config";
import type { AnalyzerDictionary } from "@/i18n/dictionaries";
import { RedoIcon, ResetIcon, UndoIcon } from "../icons";
import { Button, Card, Select, cx, format } from "../ui";
import { KeyboardMap } from "./keyboard-map";
import { formatters } from "./numbers";
import { ReplacementsPanel } from "./replacements-panel";
import { Results } from "./results";
import { deleteCorpus, loadCorpus, saveCorpus } from "./corpus-store";
import { createLocalAnalysis, type ExportKind, type LocalAnalysis } from "./local-analysis";
import { presetState, reducer, requestKey, resultStorageKey, storageKey, toSaved, type SavedState } from "./state";

/** `presets` is the list of layouts the site provides; a first visit opens `initialPreset`, its first one. */
type AnalyzerProps = { dictionary: AnalyzerDictionary; locale: Locale; presets: Preset[]; initialPreset: Preset };

/** The option standing for the layout on the map when it is not one of the list as provided. */
const CURRENT_LAYOUT = "current";

const savedSchema = z.object({
  layout: layoutSchema,
  imported: layoutSchema,
  replacements: replacementsSchema,
  replacementsName: z.string().nullable(),
  level: z.enum(analysisLevels),
  corpus: z.enum([...corpusLanguages, PERSONAL_CORPUS]).optional(),
  /** The name of `corpus` before the corpus import. */
  language: z.enum(corpusLanguages).optional(),
  presetId: z.string().nullable().optional(),
  personalCorpus: z.object({ name: z.string(), characters: z.number(), savedAt: z.number() }).nullable().optional(),
});

function readSaved(): SavedState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    // Sessions saved before letters were always paired get the same treatment as new edits.
    const { language, corpus, ...saved } = parsed.data;
    return {
      ...(saved as Omit<SavedState, "corpus">),
      corpus: corpus ?? language ?? "en",
      layout: completeLayoutPairs(saved.layout),
      imported: completeLayoutPairs(saved.imported),
    };
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

/**
 * The last result is kept for the browser tab, so that switching the interface language,
 * which loads the other page, does not wipe an analysis that still applies.
 */
function readSavedResult(key: string): AnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(resultStorageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { key?: unknown; result?: AnalysisResult };
    // A result saved by an older version of the site lacks the newer fields: it is analysed again.
    return saved.key === key && saved.result?.keyPresses && saved.result.trigrams && saved.result.missingChars ? saved.result : null;
  } catch {
    return null;
  }
}

function writeSavedResult(key: string, result: AnalysisResult) {
  try {
    sessionStorage.setItem(resultStorageKey, JSON.stringify({ key, result }));
  } catch {
    // Without storage, the result simply does not survive a page change.
  }
}

function importProblemText(problem: ImportProblem, labels: AnalyzerDictionary["layout"]["errors"]): string {
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

export function Analyzer({ dictionary, locale, presets, initialPreset }: AnalyzerProps) {
  const [state, dispatch] = useReducer(reducer, initialPreset, presetState);
  const [downloading, setDownloading] = useState<ExportKind | null>(null);
  const tomlInput = useRef<HTMLInputElement>(null);
  const corpusInput = useRef<HTMLInputElement>(null);
  const local = useRef<LocalAnalysis | null>(null);
  // Settles once the stored personal corpus, if any, has reached the worker: an analysis waits for it.
  const corpusRestored = useRef<Promise<void>>(Promise.resolve());
  // Set by an import or a removal, so that a slow read of the stored corpus does not bring the old one back.
  const corpusChanged = useRef(false);
  const jsonInput = useRef<HTMLInputElement>(null);
  const numbers = useMemo(() => formatters(locale), [locale]);
  const labels = dictionary.layout;

  const localAnalysis = () => (local.current ??= createLocalAnalysis());
  const currentPreset = presets.find((preset) => preset.id === state.presetId);
  // What replaces the personal corpus when it goes: the corpus of the current layout, or English.
  const fallbackCorpus: CorpusLanguage = currentPreset?.corpus ?? "en";

  // Storage cleared or blocked since: the saved session cannot use its corpus any more.
  const onCorpusLost = useEffectEvent((presetId: string | null | undefined) => {
    const savedPreset = presets.find((preset) => preset.id === presetId);
    dispatch({ type: "removePersonalCorpus", fallback: savedPreset?.corpus ?? "en" });
  });

  // The saved session is read after hydration, since the server cannot see it.
  useEffect(() => {
    const saved = readSaved();
    dispatch({ type: "restore", saved, result: saved ? readSavedResult(requestKey({ ...saved, personalCorpus: saved.personalCorpus ?? null })) : null });
    corpusRestored.current = loadCorpus().then((stored) => {
      if (corpusChanged.current) return;
      if (stored) {
        localAnalysis().setCorpus(stored.text);
        dispatch({ type: "personalCorpusRestored", personalCorpus: { name: stored.name, characters: stored.characters, savedAt: stored.savedAt } });
      } else {
        onCorpusLost(saved?.presetId);
      }
    });
    return () => {
      local.current?.dispose();
      local.current = null;
    };
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

  const input = { layout: state.layout, replacements: state.replacements, level: state.level };
  const key = requestKey(state);

  const onImportCorpus = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const refuse = (template: string) => dispatch({ type: "notice", notice: { tone: "error", text: format(template, { name: file.name }) } });
    // Refused before reading, so that a huge file is never loaded.
    if (file.size > MAX_CORPUS_BYTES) return refuse(labels.errors.corpusTooLarge);
    const decoded = decodeCorpus(new Uint8Array(await file.arrayBuffer()));
    if (!decoded.ok) {
      const problems = { empty: labels.errors.corpusEmpty, "too-large": labels.errors.corpusTooLarge, "not-text": labels.errors.corpusNotText };
      return refuse(problems[decoded.problem]);
    }
    corpusChanged.current = true;
    const personalCorpus = { name: file.name, characters: decoded.text.length, savedAt: Date.now() };
    localAnalysis().setCorpus(decoded.text);
    const stored = await saveCorpus({ ...personalCorpus, text: decoded.text });
    const messages = [format(labels.corpusImported, { name: file.name, count: numbers.integer(personalCorpus.characters) })];
    if (decoded.encoding === "windows-1252") messages.push(labels.corpusLegacyEncoding);
    if (!stored) messages.push(labels.corpusNotStored);
    dispatch({ type: "setPersonalCorpus", personalCorpus, notice: { tone: "info", text: messages.join(" ") } });
  };

  const removeCorpus = () => {
    corpusChanged.current = true;
    local.current?.setCorpus(null);
    void deleteCorpus();
    dispatch({ type: "removePersonalCorpus", fallback: fallbackCorpus });
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
    dispatch({ type: "analysisStarted" });
    try {
      let result: AnalysisResult;
      if (state.corpus === PERSONAL_CORPUS) {
        await corpusRestored.current;
        result = await localAnalysis().analyse(key, input);
      } else {
        const body: AnalysisRequest = analysisRequestSchema.parse({ ...input, language: state.corpus });
        const response = await fetch("/api/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(String(response.status));
        result = (await response.json()) as AnalysisResult;
      }
      writeSavedResult(key, result);
      dispatch({ type: "analysisSucceeded", result, key });
    } catch {
      dispatch({ type: "analysisFailed" });
    }
  };

  const download = async (kind: ExportKind) => {
    setDownloading(kind);
    try {
      let blob: Blob;
      if (state.corpus === PERSONAL_CORPUS) {
        await corpusRestored.current;
        // As the export route does: French spreadsheets expect semicolons, since the comma is their decimal separator.
        const options = { separator: locale === "fr" ? (";" as const) : ("," as const), headers: dictionary.csv };
        blob = new Blob([await localAnalysis().exportCsv(key, input, kind, options)], { type: "text/csv;charset=utf-8" });
      } else {
        const response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, locale, analysis: { ...input, language: state.corpus } }),
        });
        if (!response.ok) throw new Error(String(response.status));
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
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

  // The list shows a layout of its own as long as it is untouched; otherwise an extra first option names what is
  // on the map, "Propergol (modified)" for instance, and choosing a layout of the list loads it again (question 38).
  const untouched = sameLayout(state.layout, state.imported);
  const presetValue = currentPreset && untouched && state.replacementsName === currentPreset.replacementsName ? currentPreset.id : CURRENT_LAYOUT;
  const layoutName = currentPreset?.name ?? (state.layout.name || labels.unnamed);
  const currentLabel = currentPreset || !untouched ? format(labels.modified, { name: layoutName }) : layoutName;
  const onChoosePreset = (id: string) => {
    const preset = presets.find((item) => item.id === id);
    if (preset) dispatch({ type: "loadPreset", preset, notice: { tone: "info", text: format(labels.presetLoaded, { name: preset.name }) } });
  };

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
            <input ref={corpusInput} type="file" accept=".txt,text/plain" className="hidden" onChange={onImportCorpus} />
            <input ref={tomlInput} type="file" accept=".toml,text/plain" className="hidden" onChange={onImportToml} />
            <input ref={jsonInput} type="file" accept=".json,application/json" className="hidden" onChange={onImportJson} />
            <Button onClick={() => corpusInput.current?.click()}>{labels.importCorpus}</Button>
            <Button onClick={() => tomlInput.current?.click()}>{labels.importToml}</Button>
            <Button onClick={() => jsonInput.current?.click()}>{labels.importReplacements}</Button>
            {state.replacementsName && (
              <Button variant="ghost" onClick={() => dispatch({ type: "setReplacements", replacements: emptyReplacements, name: null, notice: null })}>
                {labels.removeReplacements}
              </Button>
            )}
            {state.personalCorpus && (
              <Button variant="ghost" onClick={removeCorpus}>
                {labels.removeCorpus}
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

        {/* The replacements column starts level with the selectors; the history buttons sit under the map's help text. */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <Select label={labels.preset} value={presetValue} onChange={(event) => onChoosePreset(event.target.value)}>
                {presetValue === CURRENT_LAYOUT && <option value={CURRENT_LAYOUT}>{currentLabel}</option>}
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </Select>
              <Select label={labels.shape} value={state.layout.shapeId} onChange={(event) => dispatch({ type: "setShape", shapeId: event.target.value as (typeof shapeIds)[number] })}>
                {shapeIds.map((id) => (
                  <option key={id} value={id}>
                    {labels.shapes[id]}
                  </option>
                ))}
              </Select>
              <Select label={labels.corpus} value={state.corpus} onChange={(event) => dispatch({ type: "setCorpus", corpus: event.target.value as CorpusId })}>
                {corpusLanguages.map((id) => (
                  <option key={id} value={id}>
                    {labels.corpora[id]}
                  </option>
                ))}
                {state.personalCorpus && <option value={PERSONAL_CORPUS}>{format(labels.corpora.personal, { name: state.personalCorpus.name })}</option>}
              </Select>
              <Select label={labels.level} disabled={!state.replacementsName} value={state.level} onChange={(event) => dispatch({ type: "setLevel", level: event.target.value as (typeof analysisLevels)[number] })}>
                {(state.replacementsName ? analysisLevels : analysisLevels.slice(0, 1)).map((id) => (
                  <option key={id} value={id}>
                    {labels.levels[id]}
                  </option>
                ))}
              </Select>
            </div>
            <KeyboardMap
              layout={state.layout}
              keyPresses={state.result?.keyPresses ?? null}
              labels={labels}
              onChange={(layout) => dispatch({ type: "edit", layout })}
            />
            <div className="mt-2 -ml-3.5 flex flex-wrap items-center gap-1">
              {/* The shortcuts are handled above, on the whole page. */}
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: "undo" })}
                disabled={state.past.length === 0}
                title={`${labels.undo} (${labels.undoShortcut})`}
                aria-keyshortcuts="Control+Z Meta+Z"
              >
                <UndoIcon />
                {labels.undo}
              </Button>
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: "redo" })}
                disabled={state.future.length === 0}
                title={`${labels.redo} (${labels.redoShortcut})`}
                aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
              >
                <RedoIcon />
                {labels.redo}
              </Button>
              <Button variant="ghost" onClick={() => dispatch({ type: "reset" })} disabled={sameLayout(state.layout, state.imported)}>
                <ResetIcon />
                {labels.reset}
              </Button>
            </div>
          </div>
          <ReplacementsPanel
            replacements={state.replacements}
            level={state.level}
            name={state.replacementsName}
            layout={state.layout}
            labels={dictionary.replacements}
            legend={labels.legend}
          />
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
            <Results result={state.result} dictionary={dictionary} numbers={numbers} shapeId={state.layout.shapeId} />
          </div>
        ) : (
          state.status !== "failed" && (
            // Hidden until the saved session is read, so that restored statistics do not flash this message first.
            <div className={cx("rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted", !state.hydrated && "invisible")}>
              {state.cleared ? dictionary.analysis.cleared : dictionary.analysis.empty}
            </div>
          )
        )}
      </div>
    </div>
  );
}
