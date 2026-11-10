"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { Layout } from "@/domain/layout";
import type { AnalysisLevel, Replacements } from "@/domain/replacements";
import { SPACE } from "@/domain/symbols";
import type { CorpusLanguage } from "@/domain/valid-chars";
import { buildKeyMap, missingKeys } from "@/engine/keymap";
import type { Dictionary } from "@/i18n/dictionaries";
import { cx, format } from "../ui";
import { specialName } from "./keyboard-map";

type ReplacementsPanelProps = {
  replacements: Replacements;
  /** What the "Replacements" selector says: only the matching rules are listed (feedback 12). */
  level: AnalysisLevel;
  name: string | null;
  /** The engine ignores a replacement that this map cannot type: the panel strikes it through. */
  layout: Layout;
  language: CorpusLanguage;
  labels: Dictionary["replacements"];
  legend: Dictionary["layout"]["legend"];
};

/** How many replacements show before the list scrolls (feedback 9). */
const VISIBLE_RULES = 12;

/** Reads "to write this, type that", as Kawamashi asked (question 14 of the specs). */
export function ReplacementsPanel({ replacements, level, name, layout, language, labels, legend }: ReplacementsPanelProps) {
  const groups = [
    { title: labels.essential, rules: level === "raw" ? [] : replacements.essentialCorrections },
    { title: labels.optional, rules: level === "clever" ? replacements.optionalCorrections : [] },
  ].filter((group) => group.rules.length > 0);

  // The same test as the engine's (`canType` in `adapt.ts`): a rule the map cannot type is ignored by the analysis.
  const keyMap = useMemo(() => buildKeyMap(layout, { language }), [layout, language]);
  const missingOf = (keys: string) => missingKeys(keyMap, keys);
  const missing = [...new Set(groups.flatMap((group) => group.rules.flatMap((rule) => missingOf(rule.keys))))];
  const describe = (char: string) => {
    const special = specialName(char, legend);
    return special ? `${char} (${special})` : char === SPACE ? "␣" : char;
  };

  // The list is cut right under the 12th replacement, whatever the headings above it.
  const list = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const rows = element.querySelectorAll("tr[data-rule]");
    const last = rows[VISIBLE_RULES - 1];
    if (rows.length <= VISIBLE_RULES || !last) {
      element.style.maxHeight = "";
      return;
    }
    const padding = parseFloat(getComputedStyle(element).paddingBottom);
    const bottom = last.getBoundingClientRect().bottom - element.getBoundingClientRect().top + element.scrollTop;
    element.style.maxHeight = `${Math.ceil(bottom + padding)}px`;
  });

  return (
    <aside className="flex min-h-0 flex-col self-start rounded-xl border border-border bg-surface-muted/60" aria-label={labels.title}>
      <header className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">{labels.title}</h3>
        {name && <p className="truncate text-xs text-muted">{name}</p>}
        {missing.length > 0 && (
          <p className="mt-1 text-xs font-medium text-danger">
            {format(labels.ignored, { keys: missing.map(describe).join(", ") })}
          </p>
        )}
      </header>
      {groups.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted">{name ? labels.hidden : labels.empty}</p>
      ) : (
        // The scrollbar stays visible, so that the hidden replacements are not overlooked.
        <div ref={list} tabIndex={0} className="scrollbar-visible overflow-y-auto px-3 py-2 focus-visible:outline-2 focus-visible:outline-accent">
          {groups.map((group) => (
            <section key={group.title} className="mb-3 last:mb-0">
              <h4 className="mb-1 text-[0.7rem] font-semibold tracking-wide text-faint uppercase">{group.title}</h4>
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr>
                    <th>{labels.toWrite}</th>
                    <th />
                    <th>{labels.type}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rules.map((rule, index) => {
                    const ignored = missingOf(rule.keys).length > 0;
                    return (
                      <tr
                        key={`${rule.text}-${index}`}
                        data-rule
                        title={ignored ? labels.ignoredRule : undefined}
                        className={cx("border-t border-border/70 first:border-t-0", ignored && "text-faint line-through")}
                      >
                        <td className="py-1 pr-2 font-mono">
                          {rule.text}
                          {ignored && <span className="sr-only"> ({labels.ignoredRule})</span>}
                        </td>
                        <td aria-hidden className="py-1 text-faint">
                          →
                        </td>
                        <td className={cx("py-1 pl-2 text-right font-mono font-semibold", !ignored && "text-accent")}>{rule.keys}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
