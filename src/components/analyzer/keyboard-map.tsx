"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState, type KeyboardEvent } from "react";
import { clearZone, dropZone, tryMove, tryType, type EditResult, type ZoneRef } from "@/domain/edit";
import { shapes, type KeySlot } from "@/domain/geometry";
import { baseCharsOnMap, visibleZones, type Layout, type Zone } from "@/domain/layout";
import { actionKeys, DEAD_KEY, MAGIC_KEY, REPEAT_KEY, SPACE } from "@/domain/symbols";
import type { CorpusLanguage } from "@/domain/valid-chars";
import type { Dictionary } from "@/i18n/dictionaries";
import { cx, format } from "../ui";

type Labels = Dictionary["layout"];

type KeyboardMapProps = {
  layout: Layout;
  language: CorpusLanguage;
  keyPresses: Record<string, number> | null;
  labels: Labels;
  onChange: (layout: Layout) => void;
};

const zoneOrder: Zone[] = ["shift", "dkShift", "base", "dk"];

const zoneId = (ref: ZoneRef) => `${ref.key}|${ref.zone}`;
const parseZoneId = (id: string): ZoneRef => {
  const [key = "", zone = "base"] = id.split("|");
  return { key, zone: zone as Zone };
};

/** Heat from 0 to 1. Space is so frequent that the scale ignores it, then caps it at 1. */
function heatScale(layout: Layout, keyPresses: Record<string, number> | null) {
  if (!keyPresses) return () => null;
  let max = 0;
  for (const [key, presses] of Object.entries(keyPresses)) {
    if (layout.keys[key]?.base !== SPACE) max = Math.max(max, presses);
  }
  return (key: string) => {
    const presses = keyPresses[key] ?? 0;
    if (max === 0 || presses === 0) return 0;
    return Math.min(1, Math.sqrt(presses / max));
  };
}

/** `from` is null for a special key dragged from the legend, which is not on the map yet or is moved from wherever it sits. */
type Drag = { from: ZoneRef | null; char: string; target: ZoneRef | null; overTrash: boolean };

const LEGEND_PREFIX = "legend:";

/** What dropping on a zone does: a character of the map moves, a key of the legend is typed there. */
const dropResult = (layout: Layout, drag: Drag, target: ZoneRef): EditResult =>
  drag.from ? tryMove(layout, drag.from, target) : tryType(layout, target, drag.char);

const TRASH_ID = "trash";

export const specialName = (char: string, legend: Labels["legend"]): string | undefined =>
  char === DEAD_KEY ? legend.dead : char === REPEAT_KEY ? legend.repeat : char === MAGIC_KEY ? legend.magic : undefined;

/** What is said or written for a character: the special keys carry their name, since a bare symbol means nothing. */
const showChar =(char: string, labels: Labels) => {
  if (char === SPACE) return labels.space;
  const name = specialName(char, labels.legend);
  return name === undefined ? char : `${char} (${name})`;
};

/** The zones a move would change, to highlight them while the user is still dragging. */
function changedZones(before: Layout, after: Layout, keys: string[], language: CorpusLanguage): Set<string> {
  const changed = new Set<string>();
  for (const key of keys) {
    const was = visibleZones(before.keys[key] ?? {}, language);
    const will = visibleZones(after.keys[key] ?? {}, language);
    for (const zone of zoneOrder) if (was[zone] !== will[zone] && will[zone] !== undefined) changed.add(zoneId({ key, zone }));
  }
  return changed;
}

export function KeyboardMap({ layout, language, keyPresses, labels, onChange }: KeyboardMapProps) {
  const shape = shapes[layout.shapeId];
  const [selected, setSelected] = useState<ZoneRef | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Read by screen readers after a deletion made with the keyboard, which has no drag announcement.
  const [notice, setNotice] = useState("");
  // The special key that made the last edit fail. Kept with its layout, so that it goes away once the layout changes.
  const [refusal, setRefusal] = useState<{ char: string; layout: Layout } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const heat = useMemo(() => heatScale(layout, keyPresses), [layout, keyPresses]);

  // While dragging over a key, the map already shows the result of the drop, or why it is refused.
  const drop = drag?.target ? dropResult(layout, drag, drag.target) : null;
  const preview = drop?.layout ?? layout;
  const changed = drop ? changedZones(layout, preview, shape.keys.map((slot) => slot.id), language) : new Set<string>();
  const refused = drop ? drop.refused : refusal?.layout === layout ? refusal.char : undefined;

  const charAt = (ref: ZoneRef) => visibleZones(layout.keys[ref.key] ?? {}, language)[ref.zone];
  const keyName = (key: string) => {
    const zones = visibleZones(layout.keys[key] ?? {}, language);
    const main = zones.shift ?? zones.base ?? zones.dk;
    return main === undefined ? "" : showChar(main, labels);
  };

  /** The character being dragged, from the map or from the legend. */
  const draggedChar = (id: string) => (id.startsWith(LEGEND_PREFIX) ? id.slice(LEGEND_PREFIX.length) : charAt(parseZoneId(id)));

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const char = draggedChar(id);
    if (char !== undefined) setDrag({ from: id.startsWith(LEGEND_PREFIX) ? null : parseZoneId(id), char, target: null, overTrash: false });
    setSelected(null);
    setNotice("");
    setRefusal(null);
  };

  const onDragMove = (event: DragMoveEvent) => {
    const activator = event.activatorEvent as PointerEvent;
    const rect = event.over?.rect;
    setDrag((current) => {
      if (!current) return current;
      if (event.over?.id === TRASH_ID) return current.overTrash && !current.target ? current : { ...current, target: null, overTrash: true };
      if (!rect || !event.over) return current.target || current.overTrash ? { ...current, target: null, overTrash: false } : current;
      const x = (activator.clientX + event.delta.x - rect.left) / rect.width;
      const y = (activator.clientY + event.delta.y - rect.top) / rect.height;
      const target = { key: String(event.over.id), zone: dropZone(current.from?.zone ?? "base", x, y) };
      const same = current.target?.key === target.key && current.target.zone === target.zone;
      return same && !current.overTrash ? current : { ...current, target, overTrash: false };
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const target = drag?.target;
    if (drag?.from && drag.overTrash && event.over?.id === TRASH_ID) remove(drag.from);
    else if (drag && target && event.over) {
      const result = dropResult(layout, drag, target);
      // A refused move gives the same layout back: nothing to record for undo, but the reason stays in sight.
      if (result.refused !== undefined) setRefusal({ char: result.refused, layout });
      else if (result.layout !== layout) onChange(result.layout);
    }
    setDrag(null);
  };

  const remove = (ref: ZoneRef) => {
    const next = clearZone(layout, ref);
    // An empty zone gives the same layout back: nothing to record for undo.
    if (next === layout) return;
    onChange(next);
    setNotice(labels.drag.deleted);
  };

  const onZoneKeyDown = (ref: ZoneRef, event: KeyboardEvent<HTMLButtonElement>) => {
    const isSelected = selected?.key === ref.key && selected.zone === ref.zone;
    if (event.key === "Escape") {
      setSelected(null);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove(ref);
      setSelected(null);
      return;
    }
    if (!isSelected) {
      if (event.key === "Enter") {
        event.preventDefault();
        setSelected(ref);
        setRefusal(null);
      }
      return;
    }
    // Option (Mac) and AltGr (Ctrl + Alt on Windows) type accented capitals such as "È": only Cmd and Ctrl shortcuts are left alone.
    const shortcut = event.metaKey || (event.ctrlKey && !event.altKey);
    if (event.key.length === 1 && event.key !== " " && !shortcut) {
      event.preventDefault();
      const result = tryType(layout, ref, event.key);
      if (result.refused !== undefined) setRefusal({ char: result.refused, layout });
      else onChange(result.layout);
      setSelected(null);
    }
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const char = draggedChar(String(active.id));
      return char === undefined ? undefined : format(labels.drag.pickedUp, { char: showChar(char, labels) });
    },
    onDragOver: ({ over }) =>
      over?.id === TRASH_ID ? labels.trash : over ? format(labels.drag.over, { key: keyName(String(over.id)) }) : labels.drag.outside,
    onDragEnd: ({ over }) => {
      if (!over) return labels.drag.cancelled;
      if (over.id === TRASH_ID) return labels.drag.deleted;
      // A refusal is read from the hint below the map.
      if (drop?.refused !== undefined) return undefined;
      return drag?.from ? labels.drag.dropped : labels.drag.placed;
    },
    onDragCancel: () => labels.drag.cancelled,
  };

  return (
    // A fixed id keeps the accessibility ids identical on the server and in the browser.
    <DndContext
      id="keyboard-map"
      sensors={sensors}
      collisionDetection={pointerWithin}
      accessibility={{ announcements, screenReaderInstructions: { draggable: labels.hint } }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      {/* A scrolling box also clips vertically: the 8px of room, cancelled by the negative margin,
          keep the enlarged target key and its outline visible on the first row and at the edges. */}
      <div className="-m-2 overflow-x-auto p-2">
        <div
          role="group"
          aria-label={labels.mapLabel}
          className={cx("mx-auto grid w-max gap-1.5 [--cap:clamp(2.6rem,4.1vw,3.35rem)]", drag && (drop?.refused !== undefined ? "cursor-not-allowed" : "cursor-grabbing"))}
          style={{ gridTemplateColumns: `repeat(${shape.width}, var(--cap))`, gridAutoRows: "calc(var(--cap) * 0.92)" }}
        >
          {shape.keys.map((slot) => (
            <KeyCap
              key={slot.id}
              slot={slot}
              layout={preview}
              language={language}
              heat={heat(slot.id)}
              labels={labels}
              selected={selected?.key === slot.id ? selected.zone : null}
              changed={changed}
              isTarget={drag?.target?.key === slot.id}
              refused={drop?.refused !== undefined}
              isSource={drag?.from?.key === slot.id}
              dragging={drag !== null}
              onSelect={(zone) => {
                setSelected({ key: slot.id, zone });
                setRefusal(null);
              }}
              onZoneKeyDown={onZoneKeyDown}
            />
          ))}
        </div>
      </div>
      <Legend layout={layout} labels={labels} draggingKey={drag && !drag.from ? drag.char : null} />
      {/* A key of the legend is only placed, never deleted: the trash ignores it. */}
      <Trash label={labels.trash} active={drag?.overTrash ?? false} dragging={drag?.from != null} disabled={drag !== null && drag.from === null} />
      <p className={cx("mt-3 min-h-5 text-xs", refused !== undefined ? "font-medium text-danger" : "text-muted")} aria-live="polite">
        {refused !== undefined
          ? format(labels.refused, { char: showChar(refused, labels) })
          : selected
            ? labels.selectedHint
            : `${labels.hint} ${labels.trashHint}`}
      </p>
      <p className="sr-only" role="status">
        {notice}
      </p>
      <DragOverlay dropAnimation={null}>
        {drag && (
          // Lifted above the pointer, so that the key being aimed at stays visible.
          <div className="pointer-events-none flex size-10 -translate-y-[calc(100%+0.5rem)] items-center justify-center rounded-lg bg-accent text-lg font-semibold text-accent-contrast shadow-lg ring-4 ring-accent/20">
            {drag.char === SPACE ? "␣" : drag.char}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

type KeyCapProps = {
  slot: KeySlot;
  layout: Layout;
  language: CorpusLanguage;
  heat: number | null;
  labels: Labels;
  selected: Zone | null;
  changed: Set<string>;
  isTarget: boolean;
  /** The drop on this key is refused: it would send a special key where it does nothing. */
  refused: boolean;
  isSource: boolean;
  dragging: boolean;
  onSelect: (zone: Zone) => void;
  onZoneKeyDown: (ref: ZoneRef, event: KeyboardEvent<HTMLButtonElement>) => void;
};

function KeyCap({ slot, layout, language, heat, labels, selected, changed, isTarget, refused, isSource, dragging, onSelect, onZoneKeyDown }: KeyCapProps) {
  const { setNodeRef } = useDroppable({ id: slot.id });
  const visible = visibleZones(layout.keys[slot.id] ?? {}, language);
  const strong = heat !== null && heat > 0.55;
  const background =
    heat === null || heat === 0 ? undefined : `color-mix(in oklab, var(--heat) ${Math.round(6 + heat * 88)}%, var(--key))`;

  return (
    <div
      ref={setNodeRef}
      className={cx(
        // Small corners leave room for the characters set in the corners of the key.
        "relative grid grid-cols-2 grid-rows-2 rounded-[5px] border transition-[box-shadow,transform] duration-100",
        // Hovering a key frames its four zones, to show that each one can be dragged or edited.
        !dragging && "group/key",
        slot.role === "outer" ? "border-dashed border-key-border bg-surface-muted" : "border-key-border bg-key",
        slot.role === "thumb" && "rounded-[7px]",
        strong ? "text-[color:var(--heat-ink)]" : "text-foreground",
        isTarget && (refused ? "z-10 ring-2 ring-danger" : "z-10 scale-[1.06] shadow-lg ring-2 ring-accent"),
        isSource && !isTarget && dragging && "outline-2 outline-offset-1 outline-dashed outline-accent/60",
      )}
      style={{ gridColumn: slot.x + 1, gridRow: slot.y + 1, background }}
    >
      {zoneOrder.map((zone) => (
        <ZoneCell
          key={zone}
          refId={{ key: slot.id, zone }}
          char={visible[zone]}
          labels={labels}
          selected={selected === zone}
          highlighted={changed.has(zoneId({ key: slot.id, zone }))}
          strong={strong}
          interactive={!dragging}
          onSelect={() => onSelect(zone)}
          onKeyDown={onZoneKeyDown}
        />
      ))}
    </div>
  );
}

type ZoneCellProps = {
  refId: ZoneRef;
  char: string | undefined;
  labels: Labels;
  selected: boolean;
  highlighted: boolean;
  strong: boolean;
  /** False while a character is being dragged, so that the hover frames do not clutter the drop preview. */
  interactive: boolean;
  onSelect: () => void;
  onKeyDown: (ref: ZoneRef, event: KeyboardEvent<HTMLButtonElement>) => void;
};

function ZoneCell({ refId, char, labels, selected, highlighted, strong, interactive, onSelect, onKeyDown }: ZoneCellProps) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: zoneId(refId), disabled: char === undefined });
  const isRight = refId.zone === "dk" || refId.zone === "dkShift";
  const isUpper = refId.zone === "shift" || refId.zone === "dkShift";
  const zoneName = labels.zones[refId.zone];
  const display = char === SPACE ? "␣" : char;
  const ariaLabel =
    char === undefined
      ? format(labels.emptyZone, { zone: zoneName })
      : format(labels.keyLabel, { zone: zoneName, char: showChar(char, labels) });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      // An empty zone has nothing to drag but still takes a typed character, so it is not disabled.
      aria-disabled={undefined}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onDoubleClick={onSelect}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        onKeyDown(refId, event);
      }}
      className={cx(
        "flex min-w-0 touch-none select-none rounded-[4px] px-[calc(var(--cap)*0.07)] leading-none outline-none",
        isUpper ? "items-start pt-1" : "items-end pb-1",
        isRight ? "justify-end" : "justify-start",
        char !== undefined && "cursor-grab active:cursor-grabbing",
        // The frame is drawn on a layer inside the zone, so it never moves the characters.
        // It takes the key's text colour, to stay visible in both themes and on heat colours.
        "relative before:pointer-events-none before:absolute before:inset-[1.5px] before:rounded-[3.5px] before:content-['']",
        interactive &&
          !selected &&
          "before:ring-1 before:ring-transparent before:ring-inset before:transition-[box-shadow,background-color] before:duration-100 group-hover/key:before:ring-current/20 hover:before:bg-current/[0.07] hover:before:ring-current/55",
        selected && "ring-2 ring-accent ring-inset",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
        isDragging && !highlighted && "opacity-30",
      )}
    >
      {display !== undefined && (
        <span
          className={cx(
            // Sized from the key, never truncated: a wide letter such as W must stay whole on small screens.
            "relative whitespace-nowrap rounded-[0.3rem]",
            isRight ? "text-[length:calc(var(--cap)*0.21)]" : "text-[length:calc(var(--cap)*0.3)] font-semibold",
            isRight && !highlighted && (strong ? "opacity-80" : "text-muted"),
            // A preview of the drop: the characters about to land are set on an accent chip.
            highlighted && "bg-accent px-[0.2em] text-accent-contrast",
          )}
        >
          {display}
        </span>
      )}
    </button>
  );
}

/** Drop target that deletes the dragged character. Always visible, so that it can be found before dragging. */
function Trash({ label, active, dragging, disabled }: { label: string; active: boolean; dragging: boolean; disabled: boolean }) {
  const { setNodeRef } = useDroppable({ id: TRASH_ID, disabled });
  return (
    <div
      ref={setNodeRef}
      className={cx(
        "mx-auto mt-3 flex w-max items-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-sm font-medium transition-colors duration-100",
        active
          ? "border-danger bg-danger-soft text-danger"
          : dragging
            ? "border-danger/60 text-danger"
            : "border-key-border text-muted",
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
      </svg>
      {label}
    </div>
  );
}

/**
 * Names the special keys outside the keys themselves, where a thumb key has no room for text.
 * Each one can be dragged onto the map. A key that is not on the map says so in words, and is not dimmed:
 * a dimmed key looked disabled, so it did not invite dragging. Repeat in particular only acts once its symbol is placed.
 */
function Legend({ layout, labels, draggingKey }: { layout: Layout; labels: Labels; draggingKey: string | null }) {
  // Placed means read by the engine: in the base zone of a key of the current shape.
  const placed = baseCharsOnMap(layout);
  return (
    <ul aria-label={labels.legend.label} className="mx-auto mt-3 flex w-max max-w-full flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted">
      {actionKeys.map((char) => (
        <LegendItem key={char} char={char} labels={labels} placed={placed.has(char)} lifted={draggingKey === char} />
      ))}
    </ul>
  );
}

function LegendItem({ char, labels, placed, lifted }: { char: string; labels: Labels; placed: boolean; lifted: boolean }) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: LEGEND_PREFIX + char });
  const name = specialName(char, labels.legend);
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        // Typing the symbol into a selected zone is the keyboard way to place a key, so the legend stays out of the tab order.
        tabIndex={-1}
        title={labels.legend.dragHint}
        aria-label={`${char} (${name}). ${labels.legend.dragHint}`}
        className={cx(
          "flex cursor-grab touch-none select-none items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors duration-100 hover:bg-surface-muted active:cursor-grabbing",
          lifted && "opacity-30",
        )}
      >
        <kbd className="inline-flex size-6 items-center justify-center rounded-[6px] border border-key-border bg-key font-sans text-sm font-semibold text-foreground">{char}</kbd>
        <span>
          {name}
          {!placed && ` (${labels.legend.notPlaced})`}
        </span>
      </button>
    </li>
  );
}
