"use client";

import {
  type NightStudyFilter,
  type NightStudyGroupCounts,
  type NightStudyGroupMeta,
} from "@/lib/night-study";
import { cn } from "@/lib/utils";

export function NightStudyGroupSummary({
  groups,
  counts,
  activeFilter,
  totalCount,
  onFilterChange,
}: {
  groups: NightStudyGroupMeta[];
  counts: NightStudyGroupCounts;
  activeFilter: NightStudyFilter;
  totalCount: number;
  onFilterChange: (filter: NightStudyFilter) => void;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
        <div className="border-b border-black/10 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">Live Balance</h2>
          <p className="mt-1 text-sm text-slate-600">{totalCount} active cadets on this roster.</p>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            aria-pressed={activeFilter === "all"}
            onClick={() => onFilterChange("all")}
            className={cn(
              "flex w-full items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
              activeFilter === "all"
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-black/10 bg-white text-slate-700 hover:bg-slate-100",
            )}
          >
            <span className="text-sm font-semibold">All</span>
            <span className="text-sm font-semibold">{totalCount}</span>
          </button>

          {groups.map((group) => {
            const isActive = activeFilter === group.id;

            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onFilterChange(isActive ? "all" : group.id)}
                className={cn(
                  "w-full rounded-[1.25rem] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
                  isActive
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-black/10 bg-white text-slate-700 hover:bg-slate-100",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{group.label}</span>
                  <span className="text-sm font-semibold">{counts[group.id]}</span>
                </div>
                <p className={cn("mt-1 text-xs", isActive ? "text-white/80" : "text-slate-500")}>
                  {group.helperText}
                </p>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Others starts from active records and today&apos;s evening appointments, but remains editable.
        </p>
      </div>
    </aside>
  );
}
