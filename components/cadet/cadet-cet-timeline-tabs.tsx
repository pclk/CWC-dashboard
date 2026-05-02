"use client";

import { useMemo, useState } from "react";

import { CetTimeline } from "@/components/cet/cet-timeline";
import { cn } from "@/lib/utils";
import type { CetTimelineBlock } from "@/lib/cet-read";

type SerializedCetTimelineBlock = Omit<CetTimelineBlock, "startAt" | "endAt"> & {
  startAt: Date | string;
  endAt: Date | string;
};

type CadetCetTimelineDay = {
  key: "today" | "tomorrow";
  label: string;
  date: string;
  blocks: SerializedCetTimelineBlock[];
  hasUpdates: boolean;
};

export function CadetCetTimelineTabs({ days }: { days: CadetCetTimelineDay[] }) {
  const [activeKey, setActiveKey] = useState<CadetCetTimelineDay["key"]>("today");
  const hydratedDays = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        blocks: day.blocks.map((block) => ({
          ...block,
          startAt: block.startAt instanceof Date ? block.startAt : new Date(block.startAt),
          endAt: block.endAt instanceof Date ? block.endAt : new Date(block.endAt),
        })),
      })),
    [days],
  );
  const activeDay = hydratedDays.find((day) => day.key === activeKey) ?? hydratedDays[0];

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
            CET Timeline
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {activeDay.label}
            </h2>
            {activeDay.hasUpdates ? (
              <span
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                aria-live="polite"
              >
                CET updated since you last viewed
              </span>
            ) : null}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="CET day"
          className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm font-semibold sm:w-72"
        >
          {hydratedDays.map((day) => {
            const active = day.key === activeKey;

            return (
              <button
                key={day.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveKey(day.key)}
                className={cn(
                  "relative rounded-xl px-3 py-2 transition",
                  active
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950",
                )}
              >
                {day.label}
                {day.hasUpdates ? (
                  <span
                    className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500"
                    aria-label="New or changed activity"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-5">
        <CetTimeline
          blocks={activeDay.blocks}
          date={activeDay.date}
          emptyLabel="No CET scheduled"
        />
      </div>
    </section>
  );
}
