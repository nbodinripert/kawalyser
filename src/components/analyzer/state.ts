import type { ShapeId } from "@/domain/geometry";
import { sameLayout, type Layout } from "@/domain/layout";
import type { Preset } from "@/domain/presets";
import { emptyReplacements, type AnalysisLevel, type Replacements } from "@/domain/replacements";
import type { CorpusLanguage } from "@/domain/corpora";
import type { AnalysisResult } from "@/engine/analyse";

export type Notice = { tone: "info" | "error"; text: string };

export type AnalyzerState = {
  layout: Layout;
  /** The layout as last imported or chosen in the list, for the reset button. */
  imported: Layout;
  /** The layout of the list it comes from; null after a .toml import. */
  presetId: string | null;
  past: Snapshot[];
  future: Snapshot[];
  replacements: Replacements;
  replacementsName: string | null;
  level: AnalysisLevel;
  language: CorpusLanguage;
  result: AnalysisResult | null;
  status: "idle" | "running" | "failed";
  /** True when an edit has just wiped the statistics, to explain why they disappeared. */
  cleared: boolean;
  notice: Notice | null;
  /** False until the saved session has been read, so that nothing overwrites it before. */
  hydrated: boolean;
};

/**
 * What undo and redo bring back: the map, with the layout and replacements it was loaded with,
 * so that choosing a layout in the list can be undone like an edit.
 */
export type Snapshot = Pick<AnalyzerState, "layout" | "imported" | "presetId" | "replacements" | "replacementsName">;

export type Action =
  | { type: "edit"; layout: Layout }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" }
  | { type: "importLayout"; layout: Layout; notice: Notice }
  | { type: "loadPreset"; preset: Preset; notice: Notice }
  | { type: "setReplacements"; replacements: Replacements; name: string | null; notice: Notice | null }
  | { type: "setLevel"; level: AnalysisLevel }
  | { type: "setLanguage"; language: CorpusLanguage }
  | { type: "setShape"; shapeId: ShapeId }
  | { type: "restore"; saved: SavedState | null; result: AnalysisResult | null }
  | { type: "notice"; notice: Notice | null }
  | { type: "analysisStarted" }
  | { type: "analysisSucceeded"; result: AnalysisResult; key: string }
  | { type: "analysisFailed" };

const HISTORY_LIMIT = 100;

export function initialState(layout: Layout): AnalyzerState {
  return {
    layout,
    imported: layout,
    presetId: null,
    past: [],
    future: [],
    replacements: emptyReplacements,
    replacementsName: null,
    level: "raw",
    language: "en",
    result: null,
    status: "idle",
    cleared: false,
    notice: null,
    hydrated: false,
  };
}

/** A first visit opens the first layout of the list, with its replacements and corpus (question 40 of the specs). */
export function presetState(preset: Preset): AnalyzerState {
  return {
    ...initialState(preset.layout),
    presetId: preset.id,
    replacements: preset.replacements,
    replacementsName: preset.replacementsName,
    level: levelFor(preset.replacementsName),
    language: preset.corpus ?? "en",
  };
}

/** Without a file, "None" is the only possible level; a new file starts with everything on. */
function levelFor(replacementsName: string | null): AnalysisLevel {
  return replacementsName ? "clever" : "raw";
}

function snapshot(state: AnalyzerState): Snapshot {
  const { layout, imported, presetId, replacements, replacementsName } = state;
  return { layout, imported, presetId, replacements, replacementsName };
}

function remember(state: AnalyzerState): Snapshot[] {
  return [...state.past, snapshot(state)].slice(-HISTORY_LIMIT);
}

/** The keyboard shape is a setting of its own: undo keeps the current one. The level stays with the same replacements. */
function restore(state: AnalyzerState, saved: Snapshot): Partial<AnalyzerState> {
  const { shapeId } = state.layout;
  const reshape = (layout: Layout) => (layout.shapeId === shapeId ? layout : { ...layout, shapeId });
  const sameReplacements = saved.replacements === state.replacements && saved.replacementsName === state.replacementsName;
  return {
    ...saved,
    layout: reshape(saved.layout),
    imported: reshape(saved.imported),
    level: sameReplacements ? state.level : levelFor(saved.replacementsName),
  };
}

/** Anything that changes what would be analysed wipes the statistics. */
function invalidate(state: AnalyzerState): Pick<AnalyzerState, "result" | "cleared" | "status"> {
  return { result: null, cleared: state.result !== null, status: "idle" };
}

export function reducer(state: AnalyzerState, action: Action): AnalyzerState {
  switch (action.type) {
    case "edit":
      if (action.layout === state.layout) return state;
      return {
        ...state,
        ...invalidate(state),
        layout: action.layout,
        past: remember(state),
        future: [],
        notice: null,
      };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return { ...state, ...invalidate(state), ...restore(state, previous), past: state.past.slice(0, -1), future: [snapshot(state), ...state.future] };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return { ...state, ...invalidate(state), ...restore(state, next), past: remember(state), future: state.future.slice(1) };
    }
    case "reset":
      if (sameLayout(state.layout, state.imported)) return state;
      return { ...state, ...invalidate(state), layout: state.imported, past: remember(state), future: [] };
    case "importLayout":
      return {
        ...state,
        ...invalidate(state),
        layout: action.layout,
        imported: action.layout,
        presetId: null,
        past: [],
        future: [],
        notice: action.notice,
      };
    case "loadPreset": {
      const layout = { ...action.preset.layout, shapeId: state.layout.shapeId };
      return {
        ...state,
        ...invalidate(state),
        layout,
        imported: layout,
        presetId: action.preset.id,
        // A layout without replacements takes the current ones off: they were written for another layout (question 39).
        replacements: action.preset.replacements,
        replacementsName: action.preset.replacementsName,
        level: levelFor(action.preset.replacementsName),
        language: action.preset.corpus ?? state.language,
        past: remember(state),
        future: [],
        notice: action.notice,
      };
    }
    case "setReplacements":
      return {
        ...state,
        ...invalidate(state),
        replacements: action.replacements,
        replacementsName: action.name,
        level: levelFor(action.name),
        past: remember(state),
        future: [],
        notice: action.notice,
      };
    case "setLevel":
      return { ...state, ...invalidate(state), level: action.level };
    case "setLanguage":
      return { ...state, ...invalidate(state), language: action.language };
    case "setShape":
      return {
        ...state,
        ...invalidate(state),
        layout: { ...state.layout, shapeId: action.shapeId },
        imported: { ...state.imported, shapeId: action.shapeId },
      };
    case "restore":
      if (!action.saved) return { ...state, hydrated: true };
      return { ...state, ...action.saved, presetId: action.saved.presetId ?? null, level: action.saved.replacementsName ? action.saved.level : "raw", past: [], future: [], result: action.result, status: "idle", cleared: false, notice: null, hydrated: true };
    case "notice":
      return { ...state, notice: action.notice };
    case "analysisStarted":
      return { ...state, status: "running", cleared: false };
    case "analysisSucceeded":
      // A result that comes back after the layout, corpus or replacements changed no longer applies.
      if (action.key !== requestKey(state)) return { ...state, status: "idle" };
      return { ...state, status: "idle", result: action.result };
    case "analysisFailed":
      return { ...state, status: "failed" };
  }
}

export type SavedState = Pick<AnalyzerState, "layout" | "imported" | "replacements" | "replacementsName" | "level" | "language"> & {
  /** Missing from sessions saved before the list of layouts. */
  presetId?: string | null;
};

export const storageKey = "kawalyser-state-v1";

export function toSaved(state: AnalyzerState): SavedState {
  const { layout, imported, presetId, replacements, replacementsName, level, language } = state;
  return { layout, imported, presetId, replacements, replacementsName, level, language };
}

/** JSON with object keys sorted, so that the same content always gives the same text. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Identifies what an analysis was run on: a result only applies to this exact layout, corpus and replacements.
 * Key order is ignored, since a session read back from storage may list the same fields in another order.
 */
export function requestKey(state: Pick<AnalyzerState, "layout" | "replacements" | "level" | "language">): string {
  const { layout, replacements, level, language } = state;
  return stableStringify({ layout, replacements, level, language });
}

export const resultStorageKey = "kawalyser-result-v1";
