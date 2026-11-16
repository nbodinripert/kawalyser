import type { ReactNode } from "react";

/** A line icon in the text colour, 16px unless told otherwise. Decorative: the text next to it carries the label. */
function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {children}
    </svg>
  );
}

export function UndoIcon() {
  return (
    <Icon>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Icon>
  );
}

export function RedoIcon() {
  return (
    <Icon>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </Icon>
  );
}

/** A circular arrow: back to the starting point. */
export function ResetIcon() {
  return (
    <Icon>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
    </Icon>
  );
}

type SizedIcon = { size?: number };

/** A keyboard: the layouts of the list. */
export function KeyboardIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M10 13h4M7 16h10" />
    </Icon>
  );
}

/** Two halves of a split keyboard: the keyboard shapes. */
export function SplitKeyboardIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <rect x="2" y="6" width="8.5" height="11" rx="1.5" />
      <rect x="13.5" y="6" width="8.5" height="11" rx="1.5" />
      <path d="M8 19.5l2.5-2.5M16 19.5 13.5 17" />
    </Icon>
  );
}

export function UploadIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </Icon>
  );
}

export function DownloadIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </Icon>
  );
}

/** Arrows in four directions: moving a character. */
export function MoveIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" />
    </Icon>
  );
}

/** A wand: the Magic key and the replacements. */
export function WandIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="m3 21 12-12M13 7l4 4" />
      <path d="M18 2v3M16.5 3.5h3M21 8v2M20 9h2M10 2v2M9 3h2" />
    </Icon>
  );
}

export function FileTextIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </Icon>
  );
}

export function ChartIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="M3 3v18h18" />
      <path d="M8 17v-5M13 17V8M18 17v-8" />
    </Icon>
  );
}

/** Angle brackets: the source code. */
export function CodeIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
    </Icon>
  );
}

export function ArrowRightIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function CheckIcon({ size }: SizedIcon) {
  return (
    <Icon size={size}>
      <path d="m5 12 5 5 9-10" />
    </Icon>
  );
}
