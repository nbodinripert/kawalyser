"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "../ui";

export type Series = { id: string; label: string; color: string; values: number[] };

type StackedColumnsProps = {
  categories: string[];
  /** Full names of the categories, for the tooltip and the table. */
  categoryNames: string[];
  series: Series[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  tableLabel: string;
  hideTableLabel: string;
  totalLabel?: string;
  /** Prints each column's total above it. */
  showTotals?: boolean;
};

const HEIGHT = 240;
const MARGIN = { top: 22, right: 8, bottom: 26, left: 44 };
const BAR = 24;
const GAP = 2;
const RADIUS = 4;

function niceStep(max: number): number {
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw || 1));
  const normalized = raw / power;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * power;
}

/** A column segment whose top corners are rounded when it ends the stack; the baseline stays square. */
function segmentPath(x: number, y: number, width: number, height: number, roundTop: boolean): string {
  const r = roundTop ? Math.min(RADIUS, height, width / 2) : 0;
  return `M${x},${y + height}V${y + r}${r ? `Q${x},${y} ${x + r},${y}` : ""}H${x + width - r}${r ? `Q${x + width},${y} ${x + width},${y + r}` : ""}V${y + height}Z`;
}

export function StackedColumns({
  categories,
  categoryNames,
  series,
  formatValue,
  formatTick,
  tableLabel,
  hideTableLabel,
  totalLabel,
  showTotals = true,
}: StackedColumnsProps) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  // Drawn at the container's real width, so that text keeps its size whatever the screen.
  const frame = useRef<HTMLDivElement>(null);
  const [WIDTH, setWidth] = useState(640);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const totals = categories.map((_, index) => series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0));
  const step = niceStep(Math.max(...totals, 0));
  const top = Math.max(step, Math.ceil(Math.max(...totals, 0) / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = plotWidth / categories.length;
  const y = (value: number) => MARGIN.top + plotHeight - (value / top) * plotHeight;

  const activeTotal = active === null ? 0 : (totals[active] ?? 0);

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      <div ref={frame} className="relative">
        <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block max-w-full overflow-visible" role="img" aria-labelledby={titleId}>
          <title id={titleId}>{series.map((s) => s.label).join(", ")}</title>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--faint)] text-[11px]">
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {categories.map((category, index) => {
            const x = MARGIN.left + band * index + (band - BAR) / 2;
            let base = 0;
            const visibleSeries = series.filter((s) => (s.values[index] ?? 0) > 0);
            const lastId = visibleSeries.at(-1)?.id;
            return (
              <g
                key={index}
                tabIndex={0}
                role="button"
                aria-label={`${categoryNames[index]}: ${formatValue(totals[index] ?? 0)}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none [&:focus-visible>rect:first-child]:stroke-[var(--accent)]"
              >
                {/* The hit area covers the whole band, not just the painted bar. */}
                <rect x={MARGIN.left + band * index} y={MARGIN.top} width={band} height={plotHeight} fill="transparent" stroke="transparent" strokeWidth={2} rx={6} />
                {visibleSeries.map((s, position) => {
                  const value = s.values[index] ?? 0;
                  const height = (value / top) * plotHeight;
                  const gap = position > 0 ? GAP : 0;
                  const top0 = y(base + value);
                  base += value;
                  return (
                    <path
                      key={s.id}
                      d={segmentPath(x, top0, BAR, Math.max(0, height - gap), s.id === lastId)}
                      fill={s.color}
                      opacity={active === null || active === index ? 1 : 0.55}
                    />
                  );
                })}
                {/* Totals need room; on narrow screens the tooltip and the table still give them. */}
                {showTotals && band >= 52 && (totals[index] ?? 0) > 0 && (
                  <text x={x + BAR / 2} y={y(totals[index] ?? 0) - 6} textAnchor="middle" className="tabular fill-[var(--muted)] text-[10.5px] font-medium">
                    {formatValue(totals[index] ?? 0)}
                  </text>
                )}
                <text x={x + BAR / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
                  {category}
                </text>
              </g>
            );
          })}
        </svg>

        {active !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 min-w-44 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{ left: `${((MARGIN.left + band * active + band / 2) / WIDTH) * 100}%` }}
          >
            <p className="mb-1.5 font-medium text-foreground">{categoryNames[active]}</p>
            {series.map((s) => (
              <p key={s.id} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted">
                  <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular font-semibold text-foreground">{formatValue(s.values[active] ?? 0)}</span>
              </p>
            ))}
            {totalLabel && series.length > 1 && (
              <p className="mt-1 flex justify-between gap-4 border-t border-border pt-1 text-muted">
                {totalLabel}
                <span className="tabular font-semibold text-foreground">{formatValue(activeTotal)}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((value) => !value)}
        aria-expanded={showTable}
        className="mt-2 text-xs font-medium text-accent hover:underline"
      >
        {showTable ? hideTableLabel : tableLabel}
      </button>
      {showTable && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium" />
                {series.map((s) => (
                  <th key={s.id} className="py-1 pr-3 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                {totalLabel && <th className="py-1 text-right font-medium">{totalLabel}</th>}
              </tr>
            </thead>
            <tbody className="tabular">
              {categoryNames.map((name, index) => (
                <tr key={name + index} className={cx("border-t border-border")}>
                  <th className="py-1 pr-3 font-normal text-muted">{name}</th>
                  {series.map((s) => (
                    <td key={s.id} className="py-1 pr-3 text-right">
                      {formatValue(s.values[index] ?? 0)}
                    </td>
                  ))}
                  {totalLabel && <td className="py-1 text-right font-medium">{formatValue(totals[index] ?? 0)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
