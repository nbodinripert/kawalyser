"use client";

import { useState } from "react";
import { cx } from "../ui";
import type { Notice } from "./state";

/** How long an information stays: long enough to read a line, short enough not to get in the way. */
const VISIBLE_MS = 5000;

type ToastProps = { notice: Notice | null; closeLabel: string; onDismiss: () => void };

/** Each message object gets its own number, so that the same text shown twice starts its time bar over. */
const messageIds = new WeakMap<Notice, number>();
let nextMessageId = 0;
function messageId(notice: Notice): number {
  let id = messageIds.get(notice);
  if (id === undefined) {
    id = nextMessageId++;
    messageIds.set(notice, id);
  }
  return id;
}

/**
 * A message in a corner of the screen, over the page. An information leaves when its time bar runs out, after
 * 5 seconds; the bar stops while the pointer or the focus is on it, so that a long message can be read.
 * An error stays until it is closed: missed, it would be no use.
 */
export function Toast({ notice, closeLabel, onDismiss }: ToastProps) {
  // Paused for one message only: a message closed under the pointer gets no mouseleave, and must not hold the next one.
  const [pausedFor, setPausedFor] = useState<Notice | null>(null);
  const card = notice && (
    <Card
      key={messageId(notice)}
      notice={notice}
      paused={pausedFor === notice}
      closeLabel={closeLabel}
      onDismiss={onDismiss}
      onPause={(pause) => setPausedFor(pause ? notice : null)}
    />
  );

  return (
    // The live regions stay in the page, empty, so that screen readers announce what appears in them.
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end sm:left-auto sm:right-6 sm:bottom-6">
      <div role="status" aria-live="polite" className="w-full sm:w-96">
        {notice?.tone === "info" && card}
      </div>
      <div role="alert" className="w-full sm:w-96">
        {notice?.tone === "error" && card}
      </div>
    </div>
  );
}

type CardProps = {
  notice: Notice;
  paused: boolean;
  closeLabel: string;
  onDismiss: () => void;
  onPause: (paused: boolean) => void;
};

function Card({ notice, paused, closeLabel, onDismiss, onPause }: CardProps) {
  const error = notice.tone === "error";
  return (
    <div
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
      className={cx(
        "pointer-events-auto relative flex w-full animate-toast-in items-start gap-3 overflow-hidden rounded-xl border py-3.5 pr-2 pl-4 text-sm shadow-xl motion-reduce:animate-none",
        error ? "border-danger/30 bg-danger-soft text-danger" : "border-transparent bg-info font-medium text-info-ink",
      )}
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-px shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d={error ? "M12 7.5v5.5M12 16.5h.01" : "M12 11v5.5M12 7.5h.01"} />
      </svg>
      <p className="min-w-0 flex-1">{notice.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={closeLabel}
        className={cx(
          "-my-1 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-2",
          error ? "text-danger hover:bg-danger/10 focus-visible:outline-danger" : "text-info-ink/80 hover:bg-info-ink/15 hover:text-info-ink focus-visible:outline-info-ink",
        )}
      >
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      {!error && (
        // The time left, emptying from right to left. Its animation is the timer itself: when it ends, the message
        // leaves, and pausing it pauses the message. It runs even when motion is reduced, since it is the timer.
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-info-ink/25">
          <span
            className="block h-full origin-left animate-toast-timer bg-info-ink/80"
            style={{ animationDuration: `${VISIBLE_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
            onAnimationEnd={onDismiss}
          />
        </span>
      )}
    </div>
  );
}
