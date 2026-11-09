"use client";

import { useState } from "react";
import { difficultyIds, listIds, type AnalysisResult } from "@/engine/analyse";
import type { TrigramScope } from "@/engine/metrics";
import type { Dictionary } from "@/i18n/dictionaries";
import { Card, Segmented, cx } from "../ui";
import type { Formatters } from "./numbers";
import { StackedColumns } from "./stacked-columns";

type ResultsProps = { result: AnalysisResult; dictionary: Dictionary; numbers: Formatters };

export function Results({ result, dictionary, numbers }: ResultsProps) {
  return (
    <div className="grid min-w-0 gap-5 [&>*]:min-w-0">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <FingerLoad result={result} dictionary={dictionary} numbers={numbers} />
        <Hands result={result} dictionary={dictionary} numbers={numbers} />
      </div>
      <Trigrams result={result} dictionary={dictionary} numbers={numbers} />
      <Difficulties result={result} dictionary={dictionary} numbers={numbers} />
      <Distribution result={result} dictionary={dictionary} numbers={numbers} />
    </div>
  );
}

function FingerLoad({ result, dictionary, numbers }: ResultsProps) {
  const labels = dictionary.results.fingerLoad;
  return (
    <Card title={labels.title}>
      <StackedColumns
        categories={labels.short}
        categoryNames={labels.fingers}
        series={[
          { id: "home", label: labels.home, color: "var(--series-home)", values: result.fingers.map((f) => f.home) },
          { id: "other", label: labels.other, color: "var(--series-other)", values: result.fingers.map((f) => f.other) },
        ]}
        formatValue={numbers.percent}
        formatTick={(value) => numbers.percent(value).replace(/[.,]00/, "")}
        totalLabel={labels.total}
        tableLabel={dictionary.results.table}
        hideTableLabel={dictionary.results.hideTable}
      />
    </Card>
  );
}

function Hands({ result, dictionary, numbers }: ResultsProps) {
  const labels = dictionary.results.hands;
  const rows: Array<[string, { left: number; right: number }]> = [
    [labels.innerColumns, result.hands.innerColumns],
    [labels.outerColumns, result.hands.outerColumns],
    [labels.withoutThumbs, result.hands.withoutThumbs],
    [labels.overall, result.hands.overall],
  ];
  return (
    <Card title={labels.title}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="pb-2 text-left font-medium" />
            <th className="pb-2 text-right font-medium">{labels.left}</th>
            <th className="pb-2 text-right font-medium">{labels.right}</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map(([label, split]) => (
            <tr key={label} className="border-t border-border">
              <th className="py-2 text-left font-normal text-muted">{label}</th>
              <td className="py-2 text-right">{numbers.percent(split.left)}</td>
              <td className="py-2 text-right">{numbers.percent(split.right)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <Stat label={`${labels.homeKeys} · ${labels.withSpace}`} value={numbers.percent(result.homeKeys.withSpace)} />
        <Stat label={`${labels.homeKeys} · ${labels.withoutSpace}`} value={numbers.percent(result.homeKeys.withoutSpace)} />
        <Stat label={labels.presses} value={numbers.signedPercent(result.pressesChange)} hint={labels.pressesHint} className="col-span-2" />
      </dl>
    </Card>
  );
}

function Stat({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cx("rounded-xl bg-surface-muted px-3 py-2.5", className)}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tracking-tight">{value}</dd>
      {hint && <dd className="text-xs text-faint">{hint}</dd>}
    </div>
  );
}

function Trigrams({ result, dictionary, numbers }: ResultsProps) {
  const labels = dictionary.results.trigrams;
  const [scope, setScope] = useState<TrigramScope>("pad");
  const stats = result.trigrams[scope];
  const items: Array<[string, string]> = [
    [labels.alternation, numbers.percent(stats.alternation)],
    [labels.rolls, numbers.percent(stats.rolls)],
    [labels.inward, numbers.percent(stats.inward)],
    [labels.outward, numbers.percent(stats.outward)],
    [labels.oneHand, numbers.percent(stats.oneHand)],
    [labels.ratio, numbers.decimal(stats.ratio)],
    [labels.redirects, numbers.percent(stats.redirects)],
  ];
  return (
    <Card
      title={labels.title}
      actions={
        <Segmented
          label={labels.scope}
          value={scope}
          onChange={setScope}
          options={(["pad", "noSpace", "all"] as const).map((value) => ({ value, label: labels.scopes[value] }))}
        />
      }
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {items.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </dl>
    </Card>
  );
}

function Difficulties({ result, dictionary, numbers }: ResultsProps) {
  const labels = dictionary.results.difficulties;
  return (
    <Card title={labels.title}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-xl bg-accent-soft px-3 py-2.5" title={labels.totalHint}>
          <dt className="text-xs font-semibold text-foreground">{labels.total}</dt>
          <dd className="mt-0.5 text-lg font-semibold tracking-tight">
            {numbers.percent(difficultyIds.reduce((total, id) => total + result.difficulties[id], 0))}
          </dd>
          <dd className="truncate text-xs text-muted">{labels.totalHint}</dd>
        </div>
        {difficultyIds.map((id) => (
          <div key={id} className="rounded-xl bg-surface-muted px-3 py-2.5" title={labels.items[id]}>
            <dt className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">{labels.short[id]}</span>
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tracking-tight">{numbers.percent(result.difficulties[id])}</dd>
            <dd className="truncate text-xs text-muted">{labels.items[id]}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-faint">{labels.weighted}</p>

      <h3 className="mt-6 mb-3 text-sm font-semibold">{labels.details}</h3>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {listIds.map((id) => {
          const list = result.lists[id];
          const showShare = id !== "shs4" && id !== "shs5";
          return (
            <section key={id} className="w-48 shrink-0 snap-start rounded-xl border border-border">
              <header className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
                <h4 className="truncate text-xs font-semibold">{labels.lists[id]}</h4>
                {/* Same unit as the totals above; the SHS lists have no share, as in the Excel analyser. */}
                <span className="tabular text-xs text-muted">{showShare ? numbers.percent(list.share) : numbers.integer(list.total)}</span>
              </header>
              {list.entries.length === 0 ? (
                <p className="px-3 py-2 text-xs text-faint">{labels.emptyList}</p>
              ) : (
                <ol className="max-h-64 overflow-y-auto px-3 py-1.5 text-xs">
                  {list.entries.map((entry) => (
                    <li key={entry.gram} className="flex justify-between gap-2 py-0.5">
                      <span className="truncate font-mono">{entry.gram}</span>
                      <span className="tabular shrink-0 text-muted">{showShare ? numbers.percent(entry.share) : numbers.integer(entry.count)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function Distribution({ result, dictionary, numbers }: ResultsProps) {
  const labels = dictionary.results.distribution;
  const fingers = dictionary.results.fingerLoad;
  return (
    <Card title={labels.title}>
      <p className="-mt-3 mb-4 text-xs text-muted">{labels.subtitle}</p>
      <StackedColumns
        categories={fingers.short}
        categoryNames={fingers.fingers}
        series={[
          { id: "distance", label: labels.distance, color: "var(--distribution-1)", values: result.distribution.distance },
          { id: "scissors", label: labels.scissors, color: "var(--distribution-2)", values: result.distribution.scissors },
          { id: "stretch", label: labels.stretch, color: "var(--distribution-3)", values: result.distribution.stretch },
        ]}
        formatValue={numbers.integer}
        formatTick={(value) => (value >= 10000 ? `${numbers.integer(value / 1000)}k` : numbers.integer(value))}
        totalLabel={fingers.total}
        tableLabel={dictionary.results.table}
        hideTableLabel={dictionary.results.hideTable}
      />
    </Card>
  );
}
