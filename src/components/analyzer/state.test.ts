import { describe, expect, it } from "vitest";
import type { Layout } from "@/domain/layout";
import type { AnalysisResult } from "@/engine/analyse";
import { initialState, reducer, requestKey } from "./state";

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
    const saved = { layout: second, imported: second, replacements: start.replacements, replacementsName: null, level: start.level, language: start.language };
    const restored = reducer(start, { type: "restore", saved, result });
    expect(restored.result).toBe(result);
    expect(restored.layout).toBe(second);
  });

  it("identifies a request whatever the order of its fields", () => {
    const start = initialState(first);
    const reordered = { ...start, layout: { keys: { k: { base: "a" } }, shapeId: "split40" as const, name: "a" } };
    expect(requestKey(reordered)).toBe(requestKey(start));
    expect(requestKey({ ...start, language: "fr" })).not.toBe(requestKey(start));
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
