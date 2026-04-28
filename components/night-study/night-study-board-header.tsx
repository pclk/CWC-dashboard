"use client";

import { Copy, RefreshCw, RotateCcw, Search, UserCheck, Users } from "lucide-react";

import {
  type NightStudyFilter,
  type NightStudyGroupMeta,
  type NightStudyMode,
} from "@/lib/night-study";
import { cn } from "@/lib/utils";

export function NightStudyBoardHeader({
  mode,
  search,
  filterGroup,
  groups,
  bulkMode,
  savePending,
  syncPending,
  copied,
  isDirty,
  status,
  statusTone,
  onModeChange,
  onSearchChange,
  onFilterChange,
  onToggleBulkMode,
  onCopySummary,
  onLoadAutomaticOthers,
  onSyncWithCadets,
  onReset,
  onSave,
}: {
  mode: NightStudyMode;
  search: string;
  filterGroup: NightStudyFilter;
  groups: NightStudyGroupMeta[];
  bulkMode: boolean;
  savePending: boolean;
  syncPending: boolean;
  copied: boolean;
  isDirty: boolean;
  status: string | null;
  statusTone: "default" | "success" | "warning";
  onModeChange: (mode: NightStudyMode) => void;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: NightStudyFilter) => void;
  onToggleBulkMode: () => void;
  onCopySummary: () => void;
  onLoadAutomaticOthers: () => void;
  onSyncWithCadets: () => void;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Night Study</h1>
          <p className="mt-2 text-sm text-slate-600">
            Assign each cadet directly from the roster. Others is seeded from active records and
            today&apos;s evening appointments, but you can reassign anyone.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleBulkMode}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
              bulkMode
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-black/10 text-slate-700 hover:bg-slate-100",
            )}
          >
            <Users className="size-4" aria-hidden />
            {bulkMode ? "Done Selecting" : "Select Multiple"}
          </button>
          <button
            type="button"
            onClick={onCopySummary}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Copy className="size-4" aria-hidden />
            {copied ? "Copied" : "Copy Summary"}
          </button>
          <button
            type="button"
            onClick={onLoadAutomaticOthers}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="size-4" aria-hidden />
            Load Records / Appointments
          </button>
          <button
            type="button"
            onClick={onSyncWithCadets}
            disabled={syncPending || savePending}
            className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserCheck className="size-4" aria-hidden />
            {syncPending ? "Syncing..." : "Sync with Cadets"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <RotateCcw className="size-4" aria-hidden />
            Clear Manual Groups
          </button>
          <button
            type="button"
            disabled={savePending || !isDirty}
            onClick={onSave}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savePending ? "Saving..." : isDirty ? "Save Night Study" : "Saved"}
          </button>
        </div>
      </div>

      {status ? (
        <p
          className={cn(
            "mt-4 rounded-[1.25rem] px-4 py-3 text-sm",
            statusTone === "success"
              ? "border border-teal-200 bg-teal-50 text-teal-900"
              : statusTone === "warning"
                ? "border border-amber-200 bg-amber-50 text-amber-900"
                : "bg-slate-100 text-slate-700",
          )}
        >
          {status}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Assignment Mode
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onModeChange("NIGHT_STUDY")}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                mode === "NIGHT_STUDY"
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100",
              )}
            >
              I set Night study
            </button>
            <button
              type="button"
              onClick={() => onModeChange("GO_BACK_BUNK")}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                mode === "GO_BACK_BUNK"
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100",
              )}
            >
              I set Go back bunk
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="night-study-search" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Search Roster
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="night-study-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name or shorthand"
              className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-700"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={filterGroup === "all"}
          onClick={() => onFilterChange("all")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            filterGroup === "all"
              ? "bg-teal-700 text-white"
              : "border border-black/10 text-slate-700 hover:bg-slate-100",
          )}
        >
          All
        </button>
        {groups.map((group) => {
          const isActive = filterGroup === group.id;

          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onFilterChange(group.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100",
              )}
            >
              {group.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
