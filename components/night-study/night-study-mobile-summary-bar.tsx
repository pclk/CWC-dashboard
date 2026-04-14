"use client";

import {
  type NightStudyFilter,
  type NightStudyGroupCounts,
  type NightStudyGroupMeta,
} from "@/lib/night-study";
import { cn } from "@/lib/utils";

export function NightStudyMobileSummaryBar({
  groups,
  counts,
  activeFilter,
  onFilterChange,
}: {
  groups: NightStudyGroupMeta[];
  counts: NightStudyGroupCounts;
  activeFilter: NightStudyFilter;
  onFilterChange: (filter: NightStudyFilter) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white/95 p-3 shadow-sm lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        {groups.map((group) => {
          const isActive = activeFilter === group.id;

          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onFilterChange(isActive ? "all" : group.id)}
              className={cn(
                "rounded-[1rem] border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
                isActive
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-black/10 bg-white text-slate-700",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                  {group.shortLabel}
                </span>
                <span className="text-sm font-semibold">{counts[group.id]}</span>
              </div>
              <p className={cn("mt-1 text-xs", isActive ? "text-white/80" : "text-slate-500")}>
                {group.label}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
