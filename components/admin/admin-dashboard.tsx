"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  adminDashboardLoginAction,
  changeUserPasswordAsAdminAction,
  type AdminOverview,
} from "@/actions/admin";

type PersonItem = {
  label: string;
  details?: string;
};

type AdminSection = "dashboard" | "change_password";

const ADMIN_SECTIONS: Array<{ key: AdminSection; label: string; description: string }> = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Strength and personnel overview",
  },
  {
    key: "change_password",
    label: "Change CWC password",
    description: "Reset the account password",
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

const STRENGTH_BUCKET_COLORS: Record<AdminOverview["strengthBuckets"][number]["key"], string> = {
  current_fit: "#0f766e",
  current_status: "#d97706",
  not_in_camp: "#be123c",
};

function StrengthPieChart({
  buckets,
  selectedKey,
  onSelect,
}: {
  buckets: AdminOverview["strengthBuckets"];
  selectedKey: AdminOverview["strengthBuckets"][number]["key"];
  onSelect: (key: AdminOverview["strengthBuckets"][number]["key"]) => void;
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
        bucket: AdminOverview["strengthBuckets"][number];
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

function CategoryPanel({ category }: { category: AdminOverview["categories"][number] }) {
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

const TIMELINE_TYPE_STYLES: Record<
  AdminOverview["timeline"][number]["type"],
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

function EventTimeline({ events }: { events: AdminOverview["timeline"] }) {
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

      <div className="mt-4 max-h-[640px] overflow-y-auto rounded-2xl border border-black/10 bg-white">
        <div className="relative flex" style={{ height: totalHeight }}>
          <div className="relative w-28 shrink-0 border-r border-black/10 bg-slate-50/60">
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
                  className={`absolute flex flex-col gap-1 overflow-hidden rounded-xl border p-2 text-xs shadow-sm ${styles.card}`}
                  style={{
                    top: topPx,
                    height: heightPx,
                    left: `calc(${leftPercent}% + 4px)`,
                    width: `calc(${widthPercent}% - 8px)`,
                  }}
                  title={`${event.cadetLabel} / ${event.title}${showRange ? ` / ${event.startLabel} → ${event.endLabel}` : ` / ${event.startLabel}`}`}
                >
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
                  <p className="mt-auto text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {showRange ? `${event.startLabel} → ${event.endLabel}` : event.startLabel}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminSidebar({
  accountLabel,
  activeSection,
  onSectionChange,
  onSignOut,
}: {
  accountLabel: string;
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="rounded-[2rem] border border-black/10 bg-slate-950 p-5 text-white shadow-sm lg:sticky lg:top-6 lg:self-start">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
          Admin Console
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">CWC Admin</h1>
        <p className="mt-2 text-sm text-slate-300">{accountLabel}</p>
      </div>

      <nav className="mt-5 space-y-2">
        {ADMIN_SECTIONS.map((section) => {
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
          Sign out admin
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

function AdminDashboardSection({
  overview,
  activeStrengthBucketKey,
  onStrengthBucketChange,
}: {
  overview: AdminOverview;
  activeStrengthBucketKey: AdminOverview["strengthBuckets"][number]["key"];
  onStrengthBucketChange: (key: AdminOverview["strengthBuckets"][number]["key"]) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-black/10 bg-white/92 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Admin Overview
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

function ChangeCwcPasswordSection({
  accountEmail,
  pending,
  status,
  passwordValues,
  onPasswordValuesChange,
  onSubmit,
}: {
  accountEmail: string;
  pending: boolean;
  status: string | null;
  passwordValues: {
    adminPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  onPasswordValuesChange: (values: {
    adminPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Admin Tool
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Change CWC password</h2>
          <p className="mt-2 text-sm text-slate-600">
            Resets the password for {accountEmail} and signs out that account&apos;s active
            sessions.
          </p>
        </div>
        {status ? <span className="text-sm font-medium text-slate-500">{status}</span> : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="resetAdminPassword">
            Admin Password
          </label>
          <input
            id="resetAdminPassword"
            type="password"
            autoComplete="current-password"
            value={passwordValues.adminPassword}
            onChange={(event) =>
              onPasswordValuesChange({
                ...passwordValues,
                adminPassword: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="newPassword">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={passwordValues.newPassword}
            onChange={(event) =>
              onPasswordValuesChange({
                ...passwordValues,
                newPassword: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="confirmNewPassword">
            Confirm New Password
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            value={passwordValues.confirmPassword}
            onChange={(event) =>
              onPasswordValuesChange({
                ...passwordValues,
                confirmPassword: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={onSubmit}
        className="mt-5 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
      >
        Change CWC password
      </button>
    </section>
  );
}

export function AdminDashboard() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [activeStrengthBucketKey, setActiveStrengthBucketKey] =
    useState<AdminOverview["strengthBuckets"][number]["key"]>("current_fit");
  const [loginValues, setLoginValues] = useState({
    email: "",
    adminPassword: "",
  });
  const [passwordValues, setPasswordValues] = useState({
    adminPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!overview) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              Admin Console
            </p>
            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Instructor overview for CWC operations.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Sign in with the account email and admin password to view strength, MC, MA/OA,
                appointments, and current personnel status.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Back to login
            </Link>
          </section>

          <form
            action={() => {
              startTransition(async () => {
                const result = await adminDashboardLoginAction(loginValues);

                if (result.ok && result.overview) {
                  setOverview(result.overview);
                  setActiveStrengthBucketKey(
                    result.overview.strengthBuckets.find((bucket) => bucket.count > 0)?.key ??
                      "current_fit",
                  );
                  setActiveSection("dashboard");
                  setLoginValues((current) => ({
                    ...current,
                    adminPassword: "",
                  }));
                  setStatus(null);
                  return;
                }

                setStatus(
                  result.ok
                    ? result.message ?? "Admin login successful."
                    : result.error ?? "Unable to sign in.",
                );
              });
            }}
            className="space-y-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm"
          >
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Admin sign in</h2>
              <p className="text-sm text-slate-600">
                This unlocks the admin dashboard. It does not sign into the user app.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="adminEmail">
                Account Email
              </label>
              <input
                id="adminEmail"
                type="email"
                autoComplete="email"
                required
                value={loginValues.email}
                onChange={(event) =>
                  setLoginValues((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="adminPassword">
                Admin Password
              </label>
              <input
                id="adminPassword"
                type="password"
                autoComplete="current-password"
                required
                value={loginValues.adminPassword}
                onChange={(event) =>
                  setLoginValues((current) => ({
                    ...current,
                    adminPassword: event.target.value,
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

  const accountLabel = overview.account.displayName || overview.account.email;

  const handleAdminSignOut = () => {
    setOverview(null);
    setStatus(null);
    setPasswordValues({
      adminPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setActiveStrengthBucketKey("current_fit");
    setActiveSection("dashboard");
  };

  const handlePasswordSubmit = () => {
    startTransition(async () => {
      const result = await changeUserPasswordAsAdminAction({
        email: overview.account.email,
        adminPassword: passwordValues.adminPassword,
        newPassword: passwordValues.newPassword,
        confirmPassword: passwordValues.confirmPassword,
      });

      if (result.ok) {
        setPasswordValues({
          adminPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }

      setStatus(
        result.ok
          ? result.message ?? "Password updated."
          : result.error ?? "Unable to update password.",
      );
    });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <AdminSidebar
          accountLabel={accountLabel}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onSignOut={handleAdminSignOut}
        />

        {activeSection === "dashboard" ? (
          <AdminDashboardSection
            overview={overview}
            activeStrengthBucketKey={activeStrengthBucketKey}
            onStrengthBucketChange={setActiveStrengthBucketKey}
          />
        ) : (
          <ChangeCwcPasswordSection
            accountEmail={overview.account.email}
            pending={pending}
            status={status}
            passwordValues={passwordValues}
            onPasswordValuesChange={setPasswordValues}
            onSubmit={handlePasswordSubmit}
          />
        )}
      </div>
    </main>
  );
}
