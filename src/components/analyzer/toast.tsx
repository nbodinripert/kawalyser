"use client";

import { useEffect, useState } from "react";
import { cx } from "../ui";
import type { Notice } from "./state";

/** How long a message stays: long enough to read a line, short enough not to get in the way. */
const VISIBLE_MS = 5000;

type ToastProps = { notice: Notice | null; closeLabel: string; onDismiss: () => void };

/**
 * A message in a corner of the screen, over the page. An information leaves after 5 seconds, unless the pointer or
 * the focus is on it, so that a long one can be read. An error stays until it is closed: missed, it would be no use.
 */
export function Toast({ notice, closeLabel, onDismiss }: ToastProps) {
  // Paused for one message only: a message closed under the pointer gets no mouseleave, and must not hold the next one.
  const [pausedFor, setPausedFor] = useState<Notice | null>(null);
  const paused = notice !== null && pausedFor === notice;
  const onPause = (pause: boolean) => setPausedFor(pause ? notice : null);

  useEffect(() => {
    if (!notice || notice.tone === "error" || paused) return;
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, paused, onDismiss]);

  return (
    // The live regions stay in the page, empty, so that screen readers announce what appears in them.
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end sm:left-auto sm:right-6 sm:bottom-6">
      <div role="status" aria-live="polite" className="w-full sm:w-96">
        {notice?.tone === "info" && <Card notice={notice} closeLabel={closeLabel} onDismiss={onDismiss} onPause={onPause} />}
      </div>
      <div role="alert" className="w-full sm:w-96">
        {notice?.tone === "error" && <Card notice={notice} closeLabel={closeLabel} onDismiss={onDismiss} onPause={onPause} />}
      </div>
    </div>
  );
}

function Card({ notice, closeLabel, onDismiss, onPause }: { notice: Notice; closeLabel: string; onDismiss: () => void; onPause: (paused: boolean) => void }) {
  const error = notice.tone === "error";
  return (
    <div
      // A new message restarts the animation.
      key={notice.text}
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
      className={cx(
        "pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border py-3 pr-2 pl-4 text-sm shadow-lg motion-reduce:animate-none",
        error ? "border-danger/30 bg-danger-soft text-danger" : "border-border bg-surface text-foreground",
      )}
    >
      <span aria-hidden className={cx("mt-1.5 size-2 shrink-0 rounded-full", error ? "bg-danger" : "bg-accent")} />
      <p className="min-w-0 flex-1">{notice.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={closeLabel}
        className="-my-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
