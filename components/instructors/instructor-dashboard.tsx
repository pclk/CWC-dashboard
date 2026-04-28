"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  changeBatchNameAsInstructorAction,
  instructorDashboardLoginAction,
  instructorDashboardLogoutAction,
  type InstructorOverview,
} from "@/actions/instructors";

type PersonItem = {
  label: string;
  details?: string;
};

type InstructorSection = "dashboard" | "settings";

const INSTRUCTOR_SECTIONS: Array<{ key: InstructorSection; label: string; description: string }> = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Strength and personnel overview",
  },
  {
    key: "settings",
    label: "Account settings",
    description: "Change batch name",
  },
];

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/92 px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
    </article>
  );
}

function PersonList({ emptyText, people }: { emptyText: string; people: PersonItem[] }) {
  if (people.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {people.map((person, index) => (
        <div key={`${person.label}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{person.label}</p>
          {person.details ? <p className="mt-1 text-sm text-slate-600">{person.details}</p> : null}
        </div>
      ))}
    </div>
  );
}

const STRENGTH_BUCKET_COLORS: Record<InstructorOverview["strengthBuckets"][number]["key"], string> = {
  current_fit: "#0f766e",
  current_status: "#d97706",
  not_in_camp: "#be123c",
};

type RecordHeatmapMetric = "totalDays" | "recordCount";

const RECORD_HEATMAP_METRICS: Array<{
  key: RecordHeatmapMetric;
  label: string;
}> = [
  { key: "totalDays", label: "Total days" },
  { key: "recordCount", label: "Number of records" },
];

function StrengthPieChart({
  buckets,
  selectedKey,
  onSelect,
}: {
  buckets: InstructorOverview["strengthBuckets"];
  selectedKey: InstructorOverview["strengthBuckets"][number]["key"];
  onSelect: (key: InstructorOverview["strengthBuckets"][number]["key"]) => void;
}) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const selectedBucket = buckets.find((bucket) => bucket.key === selectedKey) ?? buckets[0];
  const segments = buckets.reduce(
    (accumulator, bucket) => {
      const percentage = total > 0 ? (bucket.count / total) * 100 : 0;

      return {
        offset: accumulator.offset + percentage,
        items: [
          ...accumulator.items,
          {
            bucket,
            percentage,
            offset: accumulator.offset,
          },
        ],
      };
    },
    {
      offset: 0,
      items: [] as Array<{
        bucket: InstructorOverview["strengthBuckets"][number];
        percentage: number;
        offset: number;
      }>,
    },
  ).items;

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Strength Distribution</h2>
          <p className="text-sm text-slate-600">
            Hover, click, or tap a segment to filter the personnel list.
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-500">{total} total personnel</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-center">
        <div className="relative mx-auto h-72 w-72">
          {total > 0 ? (
            <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img">
              <title>Strength distribution pie chart</title>
              {segments.map(({ bucket, percentage, offset: strokeOffset }) => {
                return (
                  <circle
                    key={bucket.key}
                    cx="100"
                    cy="100"
                    r="72"
                    fill="none"
                    pathLength={100}
                    stroke={STRENGTH_BUCKET_COLORS[bucket.key]}
                    strokeWidth={bucket.key === selectedKey ? 48 : 42}
                    strokeDasharray={`${percentage} ${100 - percentage}`}
                    strokeDashoffset={-strokeOffset}
                    className="cursor-pointer transition-all focus:outline-none"
                    tabIndex={0}
                    onMouseEnter={() => onSelect(bucket.key)}
                    onFocus={() => onSelect(bucket.key)}
                    onClick={() => onSelect(bucket.key)}
                  />
                );
              })}
            </svg>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-black/10 text-sm text-slate-500">
              No strength data
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-white/95 px-5 py-4 text-center shadow-sm">
              <p className="text-3xl font-semibold text-slate-900">{selectedBucket?.count ?? 0}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {selectedBucket?.label ?? "Personnel"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {buckets.map((bucket) => (
              <button
                key={bucket.key}
                type="button"
                onMouseEnter={() => onSelect(bucket.key)}
                onFocus={() => onSelect(bucket.key)}
                onClick={() => onSelect(bucket.key)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  bucket.key === selectedKey
                    ? "border-slate-900 bg-slate-950 text-white"
                    : "border-black/10 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span
                  className="mb-2 block h-2 w-10 rounded-full"
                  style={{ backgroundColor: STRENGTH_BUCKET_COLORS[bucket.key] }}
                />
                <span className="block text-sm font-semibold">{bucket.label}</span>
                <span className="text-sm opacity-80">{bucket.count} personnel</span>
              </button>
            ))}
          </div>

          <article className="rounded-[1.5rem] border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                {selectedBucket?.label ?? "Personnel"}
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {selectedBucket?.count ?? 0}
              </span>
            </div>
            <div className="mt-4 max-h-96 overflow-y-auto pr-1">
              <PersonList
                emptyText={`No ${(selectedBucket?.label ?? "personnel").toLowerCase()}.`}
                people={selectedBucket?.people ?? []}
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function CategoryPanel({ category }: { category: InstructorOverview["categories"][number] }) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/92 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{category.label}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Personnel</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
          {category.count}
        </span>
      </div>
      <div className="mt-4">
        <PersonList emptyText={`No ${category.label.toLowerCase()}.`} people={category.people} />
      </div>
    </article>
  );
}

function getHeatmapCellColor(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) {
    return "#ffffff";
  }

  const intensity = Math.max(value / maxValue, 0.08);
  const greenBlue = Math.round(255 - intensity * 205);

  return `rgb(239, ${greenBlue}, ${greenBlue})`;
}

function RecordHeatmap({ heatmap }: { heatmap: InstructorOverview["recordHeatmap"] }) {
  const [selectedCategory, setSelectedCategory] = useState(
    heatmap.categories.find((category) => category.key === "MC")?.key ?? heatmap.categories[0]?.key,
  );
  const [metric, setMetric] = useState<RecordHeatmapMetric>("totalDays");
  const selectedCategoryLabel =
    heatmap.categories.find((category) => category.key === selectedCategory)?.label ?? "Record";
  const cells = heatmap.cadets.map((cadet) => {
    const stat = cadet.stats.find((item) => item.category === selectedCategory);
    const value = stat?.[metric] ?? 0;

    return {
      ...cadet,
      value,
    };
  });
  const maxValue = cells.reduce((max, cell) => Math.max(max, cell.value), 0);

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Record Heatmap</h2>
          <p className="text-sm text-slate-600">
            Cadet shorthand intensity by selected record type and metric.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {heatmap.categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                  selectedCategory === category.key
                    ? "bg-slate-950 text-white"
                    : "border border-black/10 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex rounded-2xl border border-black/10 bg-white p-1">
            {RECORD_HEATMAP_METRICS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMetric(item.key)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  metric === item.key ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <span>Less</span>
        <div className="h-3 flex-1 rounded-full border border-black/10 bg-gradient-to-r from-white to-red-600" />
        <span>More</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {cells.map((cell) => (
          <div
            key={cell.id}
            title={`${cell.displayName}: ${cell.value} ${metric === "totalDays" ? "days" : "records"} of ${selectedCategoryLabel}`}
            className="min-h-20 rounded-2xl border border-black/10 px-3 py-3 shadow-sm"
            style={{
              backgroundColor: getHeatmapCellColor(cell.value, maxValue),
              color: cell.value > maxValue * 0.65 ? "#ffffff" : "#0f172a",
            }}
          >
            <p className="truncate text-sm font-semibold">{cell.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{cell.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
              {metric === "totalDays" ? "days" : "records"}
            </p>
          </div>
        ))}
      </div>

      {!heatmap.cadets.length ? (
        <p className="mt-4 rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-slate-500">
          No cadets available for heatmap.
        </p>
      ) : null}
    </section>
  );
}

const TIMELINE_TYPE_STYLES: Record<
  InstructorOverview["timeline"][number]["type"],
  { card: string; badge: string; bar: string; legendLabel: string }
> = {
  status: {
    card: "bg-amber-50 border-amber-300",
    badge: "bg-amber-200 text-amber-900",
    bar: "bg-amber-400",
    legendLabel: "Status",
  },
  absence: {
    card: "bg-rose-50 border-rose-300",
    badge: "bg-rose-200 text-rose-900",
    bar: "bg-rose-400",
    legendLabel: "Not In Camp",
  },
  appointment: {
    card: "bg-teal-50 border-teal-300",
    badge: "bg-teal-200 text-teal-900",
    bar: "bg-teal-500",
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

function EventTimeline({ events }: { events: InstructorOverview["timeline"] }) {
  if (events.length === 0) {
    return (
      <section className="rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
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
    <section className="rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
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
                  title={`${event.cadetLabel} / ${event.title}${showRange ? ` / ${event.startLabel} → ${event.endLabel}` : ` / ${event.startLabel}`}`}
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
                      {showRange ? `${event.startLabel} → ${event.endLabel}` : event.startLabel}
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

function InstructorSidebar({
  accountLabel,
  activeSection,
  onSectionChange,
  onSignOut,
}: {
  accountLabel: string;
  activeSection: InstructorSection;
  onSectionChange: (section: InstructorSection) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="rounded-[2rem] border border-black/10 bg-slate-950 p-5 text-white shadow-sm lg:sticky lg:top-6 lg:self-start">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
          Instructor Console
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">CWC Instructors</h1>
        <p className="mt-2 text-sm text-slate-300">{accountLabel}</p>
      </div>

      <nav className="mt-5 space-y-2">
        {INSTRUCTOR_SECTIONS.map((section) => {
          const active = section.key === activeSection;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onSectionChange(section.key)}
              className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                active ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <span className="block text-sm font-semibold">{section.label}</span>
              <span className={`text-xs ${active ? "text-slate-600" : "text-slate-400"}`}>
                {section.description}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 space-y-2 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Sign out instructor
        </button>
        <Link
          href="/"
          className="flex w-full justify-center rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Back to app
        </Link>
      </div>
    </aside>
  );
}

function InstructorDashboardSection({
  overview,
  activeStrengthBucketKey,
  onStrengthBucketChange,
}: {
  overview: InstructorOverview;
  activeStrengthBucketKey: InstructorOverview["strengthBuckets"][number]["key"];
  onStrengthBucketChange: (key: InstructorOverview["strengthBuckets"][number]["key"]) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Instructor Overview
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {overview.unitName} / Generated {overview.generatedAt}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        <MetricCard
          label="Current Strength"
          value={`${overview.strength.present}/${overview.strength.total}`}
          hint={`${overview.strength.absent} absent from strength`}
        />
        <MetricCard label="Upcoming MA/OA" value={`${overview.upcomingMaPersonnel.length}`} />
      </section>

      <StrengthPieChart
        buckets={overview.strengthBuckets}
        selectedKey={activeStrengthBucketKey}
        onSelect={onStrengthBucketChange}
      />

      <EventTimeline events={overview.timeline} />

      <RecordHeatmap heatmap={overview.recordHeatmap} />

      <section className="grid gap-4 xl:grid-cols-2">
        {overview.categories.map((category) => (
          <CategoryPanel key={category.key} category={category} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-1">
        <article className="rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Appointments</h2>
          <div className="mt-4">
            <PersonList emptyText="No appointments today." people={overview.todayAppointments} />
          </div>
        </article>
      </section>
    </div>
  );
}

function InstructorSettingsSection({
  batchName,
  pending,
  status,
  batchNameValues,
  onBatchNameValuesChange,
  onBatchNameSubmit,
}: {
  batchName: string;
  pending: boolean;
  status: string | null;
  batchNameValues: {
    batchName: string;
  };
  onBatchNameValuesChange: (values: {
    batchName: string;
  }) => void;
  onBatchNameSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Instructor Tool
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Change batch name</h2>
            <p className="mt-2 text-sm text-slate-600">
              Current batch name: {batchName}
            </p>
          </div>
          {status ? <span className="text-sm font-medium text-slate-500">{status}</span> : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="newBatchName">
              New batch name
            </label>
            <input
              id="newBatchName"
              type="text"
              autoComplete="username"
              value={batchNameValues.batchName}
              onChange={(event) =>
                onBatchNameValuesChange({
                  ...batchNameValues,
                  batchName: event.target.value,
                })
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={onBatchNameSubmit}
          className="mt-5 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          Change batch name
        </button>
      </section>
    </div>
  );
}

export function InstructorDashboard({ initialOverview = null }: { initialOverview?: InstructorOverview | null }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [overview, setOverview] = useState<InstructorOverview | null>(initialOverview);
  const [activeSection, setActiveSection] = useState<InstructorSection>("dashboard");
  const [activeStrengthBucketKey, setActiveStrengthBucketKey] =
    useState<InstructorOverview["strengthBuckets"][number]["key"]>(
      initialOverview?.strengthBuckets.find((bucket) => bucket.count > 0)?.key ?? "current_fit",
    );
  const [loginValues, setLoginValues] = useState({
    batchName: initialOverview?.account.batchName ?? "",
    instructorPassword: "",
  });
  const [batchNameValues, setBatchNameValues] = useState({
    batchName: initialOverview?.account.batchName ?? "",
  });

  if (!overview) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              Instructor Console
            </p>
            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Instructor overview for CWC operations.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Sign in with the batch name and instructor password to view strength, MC, MA/OA,
                appointments, and current personnel status.
              </p>
            </div>
            <Link
              href="/cwc/login"
              className="inline-flex rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to login
            </Link>
          </section>

          <form
            action={() => {
              startTransition(async () => {
                const result = await instructorDashboardLoginAction(loginValues);

                if (result.ok && result.overview) {
                  setOverview(result.overview);
                  setActiveStrengthBucketKey(
                    result.overview.strengthBuckets.find((bucket) => bucket.count > 0)?.key ??
                      "current_fit",
                  );
                  setActiveSection("dashboard");
                  setLoginValues((current) => ({
                    ...current,
                    instructorPassword: "",
                  }));
                  setBatchNameValues({
                    batchName: result.overview.account.batchName,
                  });
                  setStatus(null);
                  return;
                }

                setStatus(
                  result.ok
                    ? result.message ?? "Instructor login successful."
                    : result.error ?? "Unable to sign in.",
                );
              });
            }}
            className="space-y-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm"
          >
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Instructor sign in</h2>
              <p className="text-sm text-slate-600">
                This unlocks the instructor dashboard. It does not sign into the user app.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="instructorBatchName">
                Batch name
              </label>
              <input
                id="instructorBatchName"
                type="text"
                autoComplete="username"
                required
                value={loginValues.batchName}
                onChange={(event) =>
                  setLoginValues((current) => ({
                    ...current,
                    batchName: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="instructorPassword">
                Instructor Password
              </label>
              <input
                id="instructorPassword"
                type="password"
                autoComplete="current-password"
                required
                value={loginValues.instructorPassword}
                onChange={(event) =>
                  setLoginValues((current) => ({
                    ...current,
                    instructorPassword: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
              />
            </div>

            {status ? <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in..." : "View Overview"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const accountLabel = overview.account.displayName || overview.account.batchName;

  const handleInstructorSignOut = () => {
    startTransition(async () => {
      await instructorDashboardLogoutAction();
      setOverview(null);
      setStatus(null);
      setBatchNameValues({
        batchName: "",
      });
      setActiveStrengthBucketKey("current_fit");
      setActiveSection("dashboard");
    });
  };

  const handleBatchNameSubmit = () => {
    startTransition(async () => {
      const result = await changeBatchNameAsInstructorAction(batchNameValues);

      if (result.ok && result.batchName) {
        setOverview((current) =>
          current
            ? {
                ...current,
                account: {
                  ...current.account,
                  batchName: result.batchName ?? current.account.batchName,
                },
              }
            : current,
        );
        setBatchNameValues({
          batchName: result.batchName,
        });
        setLoginValues((current) => ({
          ...current,
          batchName: result.batchName ?? current.batchName,
        }));
      }

      setStatus(
        result.ok
          ? result.message ?? "Batch name updated."
          : result.error ?? "Unable to update batch name.",
      );
    });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <InstructorSidebar
          accountLabel={accountLabel}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onSignOut={handleInstructorSignOut}
        />

        {activeSection === "dashboard" ? (
          <InstructorDashboardSection
            overview={overview}
            activeStrengthBucketKey={activeStrengthBucketKey}
            onStrengthBucketChange={setActiveStrengthBucketKey}
          />
        ) : (
          <InstructorSettingsSection
            batchName={overview.account.batchName}
            pending={pending}
            status={status}
            batchNameValues={batchNameValues}
            onBatchNameValuesChange={setBatchNameValues}
            onBatchNameSubmit={handleBatchNameSubmit}
          />
        )}
      </div>
    </main>
  );
}
