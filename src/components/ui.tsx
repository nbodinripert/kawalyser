import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

export function Button({ variant = "secondary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-accent-contrast shadow-sm hover:bg-accent-strong",
        variant === "secondary" && "border border-border bg-surface text-foreground hover:bg-surface-muted",
        variant === "ghost" && "text-muted hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string };

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    // A disabled select fades with its label and chevron, as a disabled button does.
    <label className={cx("flex flex-col gap-1 text-xs font-medium text-muted has-disabled:opacity-50", className)}>
      {label}
      {/* The browser's own chevron cannot be spaced, so it is replaced: as far from the right edge (13px, border included) as the text is from the left. */}
      <span className="relative">
        <select
          className="h-9 w-full appearance-none rounded-lg border border-border bg-surface pr-8 pl-3 text-sm font-normal text-foreground focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed"
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className="pointer-events-none absolute top-1/2 right-[13px] h-1.5 w-2.5 -translate-y-1/2 overflow-visible text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </span>
    </label>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-surface-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cx(
            "h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent",
            option.value === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
