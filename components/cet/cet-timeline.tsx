"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CET_ACTIVITY_TYPE_LABELS,
  formatCetTime,
  formatCetTimeRange,
  getCetActivityStyle,
  getSingaporeIsoDate,
  getSingaporeTimeOfDay,
} from "@/lib/cet";
import type { CetTimelineBlock } from "@/lib/cet-read";
import { cn } from "@/lib/utils";

const PX_PER_MINUTE = 1.4;
const MIN_BLOCK_HEIGHT_PX = 64;
const MIN_TIMELINE_RANGE_HOURS = 4;
const DEFAULT_RANGE_START_HOUR = 7;
const DEFAULT_RANGE_END_HOUR = 18;
const NOW_TICK_INTERVAL_MS = 60_000;

type LaidOutBlock = CetTimelineBlock & {
  lane: number;
  laneCount: number;
  overlaps: boolean;
};

type NowState =
  | { kind: "before" }
  | { kind: "after" }
  | { kind: "in"; offsetPx: number };

type StackedItem =
  | { kind: "block"; block: LaidOutBlock }
  | { kind: "now"; variant: "before" | "after" | "in" };

function layoutBlocks(blocks: CetTimelineBlock[]): LaidOutBlock[] {
  const sorted = [...blocks].sort((a, b) => {
    const startDiff = a.startAt.getTime() - b.startAt.getTime();
    if (startDiff !== 0) return startDiff;
    return a.endAt.getTime() - b.endAt.getTime();
  });

  const result: LaidOutBlock[] = [];
  let cluster: LaidOutBlock[] = [];
  let lanes: number[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flushCluster = () => {
    const laneCount = Math.max(1, lanes.length);
    const overlaps = cluster.length > 1;
    for (const item of cluster) {
      item.laneCount = laneCount;
      item.overlaps = overlaps;
    }
  };

  for (const block of sorted) {
    const startMs = block.startAt.getTime();

    if (startMs >= clusterEnd) {
      flushCluster();
      cluster = [];
      lanes = [];
      clusterEnd = Number.NEGATIVE_INFINITY;
    }

    let lane = lanes.findIndex((end) => end <= startMs);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(block.endAt.getTime());
    } else {
      lanes[lane] = block.endAt.getTime();
    }

    const laidOut: LaidOutBlock = { ...block, lane, laneCount: 0, overlaps: false };
    cluster.push(laidOut);
    result.push(laidOut);
    clusterEnd = Math.max(clusterEnd, block.endAt.getTime());
  }

  flushCluster();
  return result;
}

function getMinuteOfSingaporeDay(date: Date): number {
  const [hour, minute] = getSingaporeTimeOfDay(date).split(":").map(Number);
  return hour * 60 + minute;
}

function computeRangeMinutes(blocks: CetTimelineBlock[]): {
  startMinute: number;
  endMinute: number;
} {
  if (blocks.length === 0) {
    return {
      startMinute: DEFAULT_RANGE_START_HOUR * 60,
      endMinute: DEFAULT_RANGE_END_HOUR * 60,
    };
  }

  let earliest = Infinity;
  let latest = -Infinity;
  for (const block of blocks) {
    earliest = Math.min(earliest, getMinuteOfSingaporeDay(block.startAt));
    latest = Math.max(latest, getMinuteOfSingaporeDay(block.endAt));
  }

  let startMinute = Math.min(earliest, DEFAULT_RANGE_START_HOUR * 60);
  let endMinute = Math.max(latest, DEFAULT_RANGE_END_HOUR * 60);

  startMinute = Math.floor(startMinute / 60) * 60;
  endMinute = Math.ceil(endMinute / 60) * 60;

  if (endMinute - startMinute < MIN_TIMELINE_RANGE_HOURS * 60) {
    endMinute = startMinute + MIN_TIMELINE_RANGE_HOURS * 60;
  }

  return { startMinute, endMinute };
}

function formatHourLabel(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  return `${hour.toString().padStart(2, "0")}00`;
}

export type CetTimelineProps = {
  blocks: CetTimelineBlock[];
  date: Date | string;
  now?: Date;
  emptyLabel?: string;
  className?: string;
  onBlockClick?: (block: CetTimelineBlock) => void;
  showAudience?: boolean;
  appointmentsHref?: string;
};

export function CetTimeline({
  blocks,
  date,
  now: initialNow,
  emptyLabel = "No CET blocks scheduled.",
  className,
  onBlockClick,
  showAudience = false,
  appointmentsHref,
}: CetTimelineProps) {
  const [now, setNow] = useState<Date>(() => initialNow ?? new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), NOW_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const dateIso = useMemo(
    () => (typeof date === "string" ? date : getSingaporeIsoDate(date)),
    [date],
  );
  const isToday = useMemo(() => getSingaporeIsoDate(now) === dateIso, [now, dateIso]);

  const laidOut = useMemo(() => layoutBlocks(blocks), [blocks]);
  const { startMinute, endMinute } = useMemo(() => computeRangeMinutes(blocks), [blocks]);
  const totalMinutes = endMinute - startMinute;
  const totalHeightPx = totalMinutes * PX_PER_MINUTE;

  const hourMarks: number[] = [];
  for (let m = startMinute; m <= endMinute; m += 60) {
    hourMarks.push(m);
  }

  const currentMinute = isToday ? getMinuteOfSingaporeDay(now) : null;
  const nowState = useMemo<NowState | null>(() => {
    if (currentMinute === null) return null;
    if (currentMinute < startMinute) return { kind: "before" };
    if (currentMinute > endMinute) return { kind: "after" };
    return { kind: "in", offsetPx: (currentMinute - startMinute) * PX_PER_MINUTE };
  }, [currentMinute, startMinute, endMinute]);

  const isBlockCurrent = (block: CetTimelineBlock) =>
    isToday && block.startAt.getTime() <= now.getTime() && block.endAt.getTime() > now.getTime();

  const stackedItems = useMemo<StackedItem[]>(() => {
    const items: StackedItem[] = laidOut.map((block) => ({ kind: "block", block }));

    if (!nowState) return items;

    if (nowState.kind === "before") {
      items.unshift({ kind: "now", variant: "before" });
      return items;
    }

    if (nowState.kind === "after") {
      items.push({ kind: "now", variant: "after" });
      return items;
    }

    const minute = currentMinute ?? 0;
    const insertIndex = laidOut.findIndex(
      (block) => getMinuteOfSingaporeDay(block.startAt) > minute,
    );
    const indicator: StackedItem = { kind: "now", variant: "in" };

    if (insertIndex === -1) {
      items.push(indicator);
    } else {
      items.splice(insertIndex, 0, indicator);
    }

    return items;
  }, [laidOut, nowState, currentMinute]);

  if (blocks.length === 0) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600",
          className,
        )}
      >
        {emptyLabel}
      </section>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      {nowState && nowState.kind !== "in" ? (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {nowState.kind === "before"
              ? `Before first activity · Now ${formatCetTime(now)}`
              : `After last activity · Now ${formatCetTime(now)}`}
          </span>
        </div>
      ) : null}
      <div className="hidden sm:block">
        <div
          className="relative rounded-2xl border border-slate-200 bg-white"
          style={{ height: `${totalHeightPx}px` }}
        >
          <div className="absolute inset-y-0 left-0 w-16 border-r border-slate-100">
            {hourMarks.map((minute) => (
              <div
                key={minute}
                className="absolute left-0 right-0 -translate-y-1/2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                style={{ top: `${(minute - startMinute) * PX_PER_MINUTE}px` }}
              >
                {formatHourLabel(minute)}
              </div>
            ))}
          </div>

          <div className="absolute inset-y-0 left-16 right-0">
            {hourMarks.map((minute) => (
              <div
                key={minute}
                className="absolute left-0 right-0 border-t border-dashed border-slate-100"
                style={{ top: `${(minute - startMinute) * PX_PER_MINUTE}px` }}
              />
            ))}

            {laidOut.map((block) => {
              const blockStartMinute = getMinuteOfSingaporeDay(block.startAt);
              const blockEndMinute = getMinuteOfSingaporeDay(block.endAt);
              const top = Math.max(0, (blockStartMinute - startMinute) * PX_PER_MINUTE);
              const rawHeight = (blockEndMinute - blockStartMinute) * PX_PER_MINUTE;
              const height = Math.max(rawHeight, MIN_BLOCK_HEIGHT_PX);
              const widthPct = 100 / block.laneCount;
              const leftPct = widthPct * block.lane;

              return (
                <TimelineCard
                  key={block.id}
                  block={block}
                  current={isBlockCurrent(block)}
                  onClick={onBlockClick}
                  showAudience={showAudience}
                  appointmentsHref={appointmentsHref}
                  style={{
                    position: "absolute",
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `calc(${leftPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                  }}
                />
              );
            })}

            {nowState?.kind === "in" ? (
              <div
                className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                style={{ top: `${nowState.offsetPx}px` }}
              >
                <span className="-ml-1 h-2 w-2 rounded-full bg-rose-500" />
                <span className="h-px flex-1 bg-rose-500" />
                <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {formatCetTime(now)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ol className="space-y-3 sm:hidden">
        {stackedItems.map((item, index) => {
          if (item.kind === "now") {
            return (
              <li key={`now-${item.variant}-${index}`}>
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="h-px flex-1 bg-rose-500" />
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Now {formatCetTime(now)}
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={item.block.id}>
              <TimelineCard
                block={item.block}
                current={isBlockCurrent(item.block)}
                onClick={onBlockClick}
                showAudience={showAudience}
                appointmentsHref={appointmentsHref}
                overlaps={item.block.overlaps}
                stacked
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type TimelineCardProps = {
  block: CetTimelineBlock;
  current: boolean;
  style?: React.CSSProperties;
  stacked?: boolean;
  showAudience?: boolean;
  overlaps?: boolean;
  appointmentsHref?: string;
  onClick?: (block: CetTimelineBlock) => void;
};

function TimelineCard({
  block,
  current,
  style,
  stacked,
  showAudience = false,
  overlaps = false,
  appointmentsHref,
  onClick,
}: TimelineCardProps) {
  const style$ = getCetActivityStyle(block.activityType);
  const label = CET_ACTIVITY_TYPE_LABELS[block.activityType];
  const venueName = block.venue?.name ?? null;
  const attireName = block.attire?.name ?? null;
  const selectedNames =
    block.visibility === "SELECTED_CADETS"
      ? block.targetCadets.map((target) => target.name).filter(Boolean).join(", ")
      : "";
  const audienceLabel = showAudience
    ? block.visibility === "COHORT"
      ? "Everyone"
      : selectedNames || "No cadets selected"
    : selectedNames || null;

  return (
    <article
      style={style}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(block) : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick(block);
              }
            }
          : undefined
      }
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border shadow-sm",
        style$.block,
        current ? "ring-2 ring-rose-400" : "",
        onClick ? "cursor-pointer outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-teal-600" : "",
        stacked ? "" : "absolute",
      )}
    >
      <div className="flex items-start justify-between gap-2 px-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              style$.badge,
            )}
          >
            {label}
          </span>
          {block.readonly ? (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {block.source === "APPOINTMENT_IMPORT" ? "Imported · MA/OA" : "Imported"}
            </span>
          ) : null}
          {block.visibility === "SELECTED_CADETS" ? (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Selected
            </span>
          ) : null}
          {stacked && overlaps ? (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              Overlaps
            </span>
          ) : null}
        </div>
        <span className="text-[11px] font-semibold text-slate-700">
          {block.estimatedDuration ? "Est. " : ""}
          {formatCetTimeRange(block.startAt, block.endAt)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-1">
        <p className="text-sm font-semibold leading-tight text-slate-900">{block.title}</p>
        {venueName ? (
          <p className="text-xs text-slate-700">{venueName}</p>
        ) : null}
        {attireName ? (
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Attire:</span> {attireName}
          </p>
        ) : null}
        {block.requiredItems ? (
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Items:</span> {block.requiredItems}
          </p>
        ) : null}
        {block.remarks ? (
          <p className="text-xs leading-snug text-slate-600">{block.remarks}</p>
        ) : null}
        {audienceLabel ? (
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            For: {audienceLabel}
          </p>
        ) : null}
        {block.source === "APPOINTMENT_IMPORT" ? (
          <p className="text-[11px] text-slate-500">
            Imported from Appointments
            {block.estimatedDuration ? " · ~30 min (estimated)" : ""}
            {appointmentsHref ? (
              <>
                {" · "}
                <a
                  href={appointmentsHref}
                  onClick={(event) => event.stopPropagation()}
                  className="font-semibold text-teal-700 underline-offset-2 hover:underline"
                >
                  Edit in Appointments
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </article>
  );
}
