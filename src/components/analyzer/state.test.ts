import { describe, expect, it } from "vitest";
import type { Layout } from "@/domain/layout";
import type { Preset } from "@/domain/presets";
import { emptyReplacements } from "@/domain/replacements";
import type { AnalysisResult } from "@/engine/analyse";
import { initialState, presetState, reducer, requestKey } from "./state";

const first: Layout = { name: "a", shapeId: "split40", keys: { k: { base: "a" } } };
const second: Layout = { ...first, keys: { k: { base: "b" } } };
const result = { keyPresses: {} } as unknown as AnalysisResult;

describe("reducer", () => {
  it("clears the statistics as soon as the layout changes", () => {
    const start = initialState(first);
    const analysed = reducer(start, { type: "analysisSucceeded", result, key: requestKey(start) });
    const edited = reducer(analysed, { type: "edit", layout: second });
    expect(edited.result).toBeNull();
    expect(edited.cleared).toBe(true);
  });

  it("undoes, redoes and resets edits", () => {
    let state = reducer(initialState(first), { type: "edit", layout: second });
    state = reducer(state, { type: "undo" });
    expect(state.layout).toBe(first);
    state = reducer(state, { type: "redo" });
    expect(state.layout).toBe(second);
    state = reducer(state, { type: "reset" });
    expect(state.layout).toBe(first);
  });

  it("does nothing on reset when the layout is the imported one, even as a distinct object read back from storage", () => {
    const start = reducer(initialState(first), {
      type: "restore",
      saved: { ...initialState(first), layout: JSON.parse(JSON.stringify(first)), imported: JSON.parse(JSON.stringify(first)) },
      result: null,
    });
    expect(reducer(start, { type: "reset" })).toBe(start);
  });

  it("offers only \"None\" without a replacements file (feedback 11)", () => {
    const start = initialState(first);
    expect(start.level).toBe("raw");
    const loaded = reducer(start, { type: "setReplacements", replacements: start.replacements, name: "r.json", notice: null });
    expect(loaded.level).toBe("clever");
    const removed = reducer(loaded, { type: "setReplacements", replacements: start.replacements, name: null, notice: null });
    expect(removed.level).toBe("raw");
  });

  it("keeps the session untouched until it has been restored", () => {
    const state = initialState(first);
    expect(state.hydrated).toBe(false);
    expect(reducer(state, { type: "restore", saved: null, result: null }).hydrated).toBe(true);
  });

  it("brings back the statistics saved for the same session, after a language switch", () => {
    const start = initialState(first);
    const saved = { layout: second, imported: second, replacements: start.replacements, replacementsName: null, level: start.level, corpus: start.corpus };
    const restored = reducer(start, { type: "restore", saved, result });
    expect(restored.result).toBe(result);
    expect(restored.layout).toBe(second);
  });

  it("identifies a request whatever the order of its fields", () => {
    const start = initialState(first);
    const reordered = { ...start, layout: { keys: { k: { base: "a" } }, shapeId: "split40" as const, name: "a" } };
    expect(requestKey(reordered)).toBe(requestKey(start));
    expect(requestKey({ ...start, corpus: "fr" })).not.toBe(requestKey(start));
  });

  it("ignores a result that comes back after the layout changed", () => {
    const start = initialState(first);
    const key = requestKey(start);
    const running = reducer(reducer(start, { type: "analysisStarted" }), { type: "edit", layout: second });
    const done = reducer(running, { type: "analysisSucceeded", result, key });
    expect(done.result).toBeNull();
    expect(done.status).toBe("idle");
  });
});

describe("layouts of the list (v2 specs)", () => {
  const withReplacements: Preset = {
    id: "p",
    name: "P",
    layout: { name: "P", shapeId: "split40", keys: { k: { base: "p" } } },
    replacements: { essentialCorrections: [{ text: "qu", keys: "q" }], optionalCorrections: [] },
    replacementsName: "p.json",
    corpus: "fr",
  };
  const without: Preset = { ...withReplacements, id: "e", name: "E", replacements: emptyReplacements, replacementsName: null, corpus: null };
  const notice = { tone: "info" as const, text: "" };

  it("opens the first layout with its replacements and corpus (question 40)", () => {
    const start = presetState(withReplacements);
    expect(start).toMatchObject({ presetId: "p", replacementsName: "p.json", level: "clever", corpus: "fr" });
    expect(start.layout).toBe(withReplacements.layout);
  });

  it("takes the replacements off with a layout that has none, and keeps the corpus without a corpus field (questions 39 and 42)", () => {
    const start = { ...presetState(withReplacements), corpus: "en" as const };
    const loaded = reducer(start, { type: "loadPreset", preset: without, notice });
    expect(loaded).toMatchObject({ presetId: "e", replacementsName: null, replacements: emptyReplacements, level: "raw", corpus: "en" });
    expect(loaded.layout.keys).toBe(without.layout.keys);
  });

  it("undoes the choice of a layout, replacements included", () => {
    const start = presetState(withReplacements);
    const loaded = reducer(start, { type: "loadPreset", preset: without, notice });
    const undone = reducer(loaded, { type: "undo" });
    expect(undone).toMatchObject({ presetId: "p", replacementsName: "p.json", level: "clever" });
    expect(undone.layout).toBe(withReplacements.layout);
    expect(reducer(undone, { type: "redo" })).toMatchObject({ presetId: "e", replacementsName: null, level: "raw" });
  });

  it("keeps the keyboard shape and the level when an edit is undone", () => {
    let state = presetState(withReplacements);
    state = reducer(state, { type: "setLevel", level: "corrections" });
    state = reducer(state, { type: "edit", layout: { ...state.layout, keys: { k: { base: "q" } } } });
    state = reducer(state, { type: "setShape", shapeId: "split34" });
    state = reducer(state, { type: "undo" });
    expect(state.layout.keys).toBe(withReplacements.layout.keys);
    expect(state.layout.shapeId).toBe("split34");
    expect(state.level).toBe("corrections");
  });

  it("loads a layout on the current keyboard shape", () => {
    const start = reducer(presetState(without), { type: "setShape", shapeId: "split34" });
    expect(reducer(start, { type: "loadPreset", preset: withReplacements, notice }).layout.shapeId).toBe("split34");
  });

  it("forgets the layout of the list after a .toml import, and reads older sessions without one", () => {
    const imported = reducer(presetState(withReplacements), { type: "importLayout", layout: first, notice });
    expect(imported.presetId).toBeNull();
    const saved = { layout: first, imported: first, replacements: emptyReplacements, replacementsName: null, level: "raw" as const, corpus: "en" as const };
    expect(reducer(presetState(withReplacements), { type: "restore", saved, result: null }).presetId).toBeNull();
  });
});

describe("personal corpus (v2 specs)", () => {
  const preset: Preset = {
    id: "p",
    name: "P",
    layout: { name: "P", shapeId: "split40", keys: { k: { base: "p" } } },
    replacements: emptyReplacements,
    replacementsName: null,
    corpus: "fr",
  };
  const mine = { name: "mine.txt", characters: 12, savedAt: 1 };
  const notice = { tone: "info" as const, text: "" };

  it("selects the corpus once imported, and clears the statistics", () => {
    const start = presetState(preset);
    const analysed = reducer(start, { type: "analysisSucceeded", result, key: requestKey(start) });
    const imported = reducer(analysed, { type: "setPersonalCorpus", personalCorpus: mine, notice });
    expect(imported).toMatchObject({ corpus: "personal", personalCorpus: mine, result: null });
  });

  it("keeps it selected when a layout of the list is chosen (question 42)", () => {
    const start = reducer(presetState(preset), { type: "setPersonalCorpus", personalCorpus: mine, notice });
    expect(reducer(start, { type: "loadPreset", preset, notice }).corpus).toBe("personal");
  });

  it("falls back to another corpus once removed, but only if it was selected", () => {
    const selected = reducer(presetState(preset), { type: "setPersonalCorpus", personalCorpus: mine, notice });
    expect(reducer(selected, { type: "removePersonalCorpus", fallback: "fr" })).toMatchObject({ corpus: "fr", personalCorpus: null });
    const other = reducer(selected, { type: "setCorpus", corpus: "en" });
    expect(reducer(other, { type: "removePersonalCorpus", fallback: "fr" })).toMatchObject({ corpus: "en", personalCorpus: null });
  });

  it("tells two imports apart in the request key, even under the same name", () => {
    const first = reducer(presetState(preset), { type: "setPersonalCorpus", personalCorpus: mine, notice });
    const second = reducer(first, { type: "setPersonalCorpus", personalCorpus: { ...mine, savedAt: 2 }, notice });
    expect(requestKey(second)).not.toBe(requestKey(first));
    // On a corpus of the site, the personal one does not count.
    expect(requestKey({ ...first, corpus: "fr" })).toBe(requestKey({ ...second, corpus: "fr" }));
  });

  it("does not select a personal corpus a saved session lost", () => {
    const saved = { layout: first, imported: first, replacements: emptyReplacements, replacementsName: null, level: "raw" as const, corpus: "personal" as const };
    expect(reducer(presetState(preset), { type: "restore", saved, result: null }).corpus).toBe("en");
  });
});

