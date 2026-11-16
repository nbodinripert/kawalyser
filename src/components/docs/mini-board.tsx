import { cx } from "../ui";

/** A key press on the left half of the main pad: rows top to bottom, columns from the pinky to the inner index. */
export type Press = { row: 0 | 1 | 2; col: 0 | 1 | 2 | 3 | 4; label: string };

type MiniBoardProps = {
  presses: Press[];
  /** The finger of each column, under the keys. */
  fingers: string[];
  /** What the drawing shows, for screen readers. */
  label: string;
};

const rows = [0, 1, 2] as const;
const columns = [0, 1, 2, 3, 4] as const;

/** A left hand of 3 × 5 keys, with the presses of a bigram numbered in order. */
export function MiniBoard({ presses, fingers, label }: MiniBoardProps) {
  return (
    <div role="img" aria-label={label} className="inline-grid gap-1.5">
      <div className="grid grid-cols-5 gap-1">
        {rows.map((row) =>
          columns.map((col) => {
            const press = presses.find((item) => item.row === row && item.col === col);
            return (
              <span
                key={`${row}-${col}`}
                className={cx(
                  "flex size-9 items-center justify-center rounded-md border text-xs font-semibold",
                  press ? "border-accent bg-accent text-accent-contrast" : "border-key-border bg-key",
                )}
              >
                {press?.label}
              </span>
            );
          }),
        )}
      </div>
      <div aria-hidden className="grid grid-cols-5 gap-1 text-center text-[10px] leading-tight text-faint">
        {fingers.map((finger, index) => (
          <span key={index}>{finger}</span>
        ))}
      </div>
    </div>
  );
}
