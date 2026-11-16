import type { ShapeId } from "@/domain/geometry";
import { sameLayout, type Layout } from "@/domain/layout";
import type { Preset } from "@/domain/presets";
import { emptyReplacements, type AnalysisLevel, type Replacements } from "@/domain/replacements";
import { PERSONAL_CORPUS, type CorpusId, type CorpusLanguage } from "@/domain/corpora";
import type { AnalysisResult } from "@/engine/analyse";

export type Notice = { tone: "info" | "error"; text: string };

/**
 * The corpus the user imported. Its text stays in the browser's storage and in the analysis worker,
 * out of the state, which is saved to localStorage: only what names it is here.
 */
export type PersonalCorpus = { name: string; characters: number; savedAt: number };

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
  corpus: CorpusId;
  personalCorpus: PersonalCorpus | null;
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
  | { type: "setCorpus"; corpus: CorpusId }
  | { type: "setPersonalCorpus"; personalCorpus: PersonalCorpus; notice: Notice }
  /** The corpus read back from the browser's storage after a reload, as it was: the selected corpus does not change. */
  | { type: "personalCorpusRestored"; personalCorpus: PersonalCorpus }
  /** `fallback` replaces the personal corpus if it was selected. */
  | { type: "removePersonalCorpus"; fallback: CorpusLanguage }
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
    corpus: "en",
    personalCorpus: null,
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
    corpus: preset.corpus ?? "en",
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
        // A personal corpus stays selected: the user compares layouts on their own text (question 42).
        corpus: state.corpus === PERSONAL_CORPUS ? state.corpus : (action.preset.corpus ?? state.corpus),
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
    case "setCorpus":
      return { ...state, ...invalidate(state), corpus: action.corpus };
    case "setPersonalCorpus":
      return { ...state, ...invalidate(state), corpus: PERSONAL_CORPUS, personalCorpus: action.personalCorpus, notice: action.notice };
    case "personalCorpusRestored":
      if (state.personalCorpus?.savedAt === action.personalCorpus.savedAt) return state;
      return { ...state, ...(state.corpus === PERSONAL_CORPUS ? invalidate(state) : {}), personalCorpus: action.personalCorpus };
    case "removePersonalCorpus":
      if (state.personalCorpus === null && state.corpus !== PERSONAL_CORPUS) return state;
      // The message about its import no longer applies.
      return state.corpus === PERSONAL_CORPUS
        ? { ...state, ...invalidate(state), corpus: action.fallback, personalCorpus: null, notice: null }
        : { ...state, personalCorpus: null, notice: null };
    case "setShape":
      return {
        ...state,
        ...invalidate(state),
        layout: { ...state.layout, shapeId: action.shapeId },
        imported: { ...state.imported, shapeId: action.shapeId },
      };
    case "restore":
      if (!action.saved) return { ...state, hydrated: true };
      return {
        ...state,
        ...action.saved,
        presetId: action.saved.presetId ?? null,
        personalCorpus: action.saved.personalCorpus ?? null,
        corpus: action.saved.corpus === PERSONAL_CORPUS && !action.saved.personalCorpus ? "en" : action.saved.corpus,
        level: action.saved.replacementsName ? action.saved.level : "raw",
        past: [],
        future: [],
        result: action.result,
        status: "idle",
        cleared: false,
        notice: null,
        hydrated: true,
      };
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

export type SavedState = Pick<AnalyzerState, "layout" | "imported" | "replacements" | "replacementsName" | "level" | "corpus"> & {
  /** Missing from sessions saved before the list of layouts. */
  presetId?: string | null;
  /** Missing from sessions saved before the corpus import. */
  personalCorpus?: PersonalCorpus | null;
};

export const storageKey = "kawalyser-state-v1";

export function toSaved(state: AnalyzerState): SavedState {
  const { layout, imported, presetId, replacements, replacementsName, level, corpus, personalCorpus } = state;
  return { layout, imported, presetId, replacements, replacementsName, level, corpus, personalCorpus };
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
export function requestKey(state: Pick<AnalyzerState, "layout" | "replacements" | "level" | "corpus" | "personalCorpus">): string {
  const { layout, replacements, level, corpus } = state;
  // A personal corpus is told apart by when it was imported: another file under the same name gives another key.
  const personal = corpus === PERSONAL_CORPUS ? state.personalCorpus : undefined;
  return stableStringify({ layout, replacements, level, corpus, personal });
}

export const resultStorageKey = "kawalyser-result-v1";
