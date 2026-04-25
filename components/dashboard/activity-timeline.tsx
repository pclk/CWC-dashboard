import type { DashboardTimelineEvent } from "@/lib/dashboard-insights";

const TIMELINE_TYPE_STYLES: Record<
  DashboardTimelineEvent["type"],
  { card: string; badge: string; legendLabel: string }
> = {
  status: {
    card: "bg-amber-50 border-amber-300",
    badge: "bg-amber-200 text-amber-900",
    legendLabel: "Status",
  },
  absence: {
    card: "bg-rose-50 border-rose-300",
    badge: "bg-rose-200 text-rose-900",
    legendLabel: "Not In Camp",
  },
  appointment: {
    card: "bg-teal-50 border-teal-300",
    badge: "bg-teal-200 text-teal-900",
    legendLabel: "MA/OA",
  },
};

function formatTimelineDayLabel(date: Date) {
  return date.toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTimelineTimeLabel(date: Date) {
  return date.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ActivityTimeline({ events }: { events: DashboardTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Upcoming Activity Timeline</h2>
        <p className="mt-4 rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-slate-500">
          No upcoming statuses, absences, or appointments.
        </p>
      </section>
    );
  }

  const INSTANT_PAD_MS = 30 * 60 * 1000;
  const ROW_SPACING_PX = 120;
  const TOP_PAD_PX = 56;
  const BOTTOM_PAD_PX = 32;
  const MIN_BAR_HEIGHT_PX = 112;
  const TIME_AXIS_WIDTH_PX = 112;
  const MIN_EVENT_CARD_WIDTH_PX = 180;

  const layoutEvents = events.map((event) => {
    const startMs = new Date(event.startAt).getTime();
    const rawEnd = new Date(event.endAt).getTime();
    const endMs = Math.max(rawEnd, startMs);

    return {
      ...event,
      startMs,
      endMs,
      paddedEndMs: event.isInstant ? startMs + INSTANT_PAD_MS : endMs,
    };
  });

  const layoutBoundarySet = new Set<number>();
  for (const event of layoutEvents) {
    layoutBoundarySet.add(event.startMs);
    layoutBoundarySet.add(event.paddedEndMs);
  }
  const layoutBoundaries = [...layoutBoundarySet].sort((a, b) => a - b);
  const boundaryIndex = new Map<number, number>();
  layoutBoundaries.forEach((ms, idx) => boundaryIndex.set(ms, idx));

  const axisBoundarySet = new Set<number>();
  for (const event of layoutEvents) {
    axisBoundarySet.add(event.startMs);
    if (!event.isInstant) {
      axisBoundarySet.add(event.paddedEndMs);
    }
  }
  const axisBoundaries = [...axisBoundarySet].sort((a, b) => a - b);

  const positionFor = (ms: number) =>
    TOP_PAD_PX + (boundaryIndex.get(ms) ?? 0) * ROW_SPACING_PX;

  const totalHeight =
    TOP_PAD_PX + Math.max(layoutBoundaries.length - 1, 1) * ROW_SPACING_PX + BOTTOM_PAD_PX;

  const sortedForColumns = [...layoutEvents].sort((a, b) => {
    const durA = a.paddedEndMs - a.startMs;
    const durB = b.paddedEndMs - b.startMs;

    if (durA !== durB) {
      return durB - durA;
    }

    return a.startMs - b.startMs;
  });

  const columns: Array<Array<{ start: number; end: number }>> = [];
  const eventToColumn = new Map<string, number>();

  for (const event of sortedForColumns) {
    let placed = false;

    for (let i = 0; i < columns.length; i += 1) {
      const overlaps = columns[i].some(
        (span) => event.startMs < span.end && event.paddedEndMs > span.start,
      );

      if (!overlaps) {
        columns[i].push({ start: event.startMs, end: event.paddedEndMs });
        eventToColumn.set(event.id, i);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([{ start: event.startMs, end: event.paddedEndMs }]);
      eventToColumn.set(event.id, columns.length - 1);
    }
  }

  const numColumns = Math.max(columns.length, 1);
  const timelineWidth = `max(100%, ${
    TIME_AXIS_WIDTH_PX + numColumns * MIN_EVENT_CARD_WIDTH_PX
  }px)`;

  const boundaryMarkers = axisBoundaries.map((ms, index) => {
    const date = new Date(ms);
    const dayLabel = formatTimelineDayLabel(date);
    const timeLabel = formatTimelineTimeLabel(date);
    const previousDayLabel =
      index > 0 ? formatTimelineDayLabel(new Date(axisBoundaries[index - 1])) : null;
    const showDay = dayLabel !== previousDayLabel;

    return {
      ms,
      topPx: positionFor(ms),
      dayLabel: showDay ? dayLabel : null,
      timeLabel,
    };
  });

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Activity Timeline</h2>
          <p className="text-sm text-slate-600">
            Earliest at top, latest at bottom. Longest spans on the left, shortest on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(TIMELINE_TYPE_STYLES) as Array<keyof typeof TIMELINE_TYPE_STYLES>).map(
            (key) => (
              <span
                key={key}
                className={`rounded-full px-2 py-1 font-semibold uppercase tracking-wider ${TIMELINE_TYPE_STYLES[key].badge}`}
              >
                {TIMELINE_TYPE_STYLES[key].legendLabel}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="mt-4 max-h-[640px] overflow-x-auto overflow-y-auto rounded-2xl border border-black/10 bg-white">
        <div className="relative flex min-w-0" style={{ height: totalHeight, width: timelineWidth }}>
          <div className="sticky left-0 z-20 w-28 shrink-0 border-r border-black/10 bg-slate-50 shadow-[2px_0_0_rgba(15,23,42,0.04)]">
            {boundaryMarkers.map((marker) => (
              <div
                key={marker.ms}
                className="absolute left-0 right-0 -translate-y-1/2 px-2"
                style={{ top: marker.topPx }}
              >
                <div className="flex flex-col leading-tight">
                  {marker.dayLabel ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                      {marker.dayLabel}
                    </span>
                  ) : null}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {marker.timeLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative flex-1">
            {boundaryMarkers.map((marker) => (
              <div
                key={marker.ms}
                className="absolute left-0 right-0 border-t border-dashed border-black/10"
                style={{ top: marker.topPx }}
              />
            ))}

            {layoutEvents.map((event) => {
              const column = eventToColumn.get(event.id) ?? 0;
              const topPx = positionFor(event.startMs);
              const rawHeightPx = positionFor(event.paddedEndMs) - topPx;
              const heightPx = Math.max(rawHeightPx, MIN_BAR_HEIGHT_PX);
              const styles = TIMELINE_TYPE_STYLES[event.type];
              const widthPercent = 100 / numColumns;
              const leftPercent = column * widthPercent;
              const showRange = event.endLabel !== event.startLabel;

              return (
                <article
                  key={event.id}
                  className={`absolute rounded-xl border text-xs shadow-sm ${styles.card}`}
                  style={{
                    top: topPx,
                    height: heightPx,
                    left: `calc(${leftPercent}% + 4px)`,
                    width: `calc(${widthPercent}% - 8px)`,
                  }}
                  title={`${event.cadetLabel} / ${event.title}${
                    showRange
                      ? ` / ${event.startLabel} -> ${event.endLabel}`
                      : ` / ${event.startLabel}`
                  }`}
                >
                  <div className="sticky top-2 z-10 flex flex-col gap-1 overflow-hidden p-2">
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}
                      >
                        {event.typeLabel}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {event.cadetLabel}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-slate-700">{event.title}</p>
                    {event.subtitle ? (
                      <p className="line-clamp-1 text-[11px] text-slate-600">{event.subtitle}</p>
                    ) : null}
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {showRange ? `${event.startLabel} -> ${event.endLabel}` : event.startLabel}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
