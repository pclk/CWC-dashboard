"use client";

import { useState } from "react";

import type { DashboardPerson, DashboardStrengthBucket } from "@/lib/dashboard-insights";

const STRENGTH_BUCKET_COLORS: Record<DashboardStrengthBucket["key"], string> = {
  current_fit: "#0f766e",
  current_status: "#d97706",
  not_in_camp: "#be123c",
};

function PersonList({ emptyText, people }: { emptyText: string; people: DashboardPerson[] }) {
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

export function StrengthPieChart({ buckets }: { buckets: DashboardStrengthBucket[] }) {
  const [selectedKey, setSelectedKey] = useState<DashboardStrengthBucket["key"]>(
    buckets.find((bucket) => bucket.count > 0)?.key ?? "current_fit",
  );
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
        bucket: DashboardStrengthBucket;
        percentage: number;
        offset: number;
      }>,
    },
  ).items;

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
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
              {segments.map(({ bucket, percentage, offset: strokeOffset }) => (
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
                  onMouseEnter={() => setSelectedKey(bucket.key)}
                  onFocus={() => setSelectedKey(bucket.key)}
                  onClick={() => setSelectedKey(bucket.key)}
                />
              ))}
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
                onMouseEnter={() => setSelectedKey(bucket.key)}
                onFocus={() => setSelectedKey(bucket.key)}
                onClick={() => setSelectedKey(bucket.key)}
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
