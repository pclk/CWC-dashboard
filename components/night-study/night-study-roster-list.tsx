"use client";

import {
  type NightStudyAssignmentGroup,
  type NightStudyFilter,
  type NightStudyGroupMeta,
  type NightStudyRosterPerson,
} from "@/lib/night-study";

import { NightStudyRosterRow } from "@/components/night-study/night-study-roster-row";

export function NightStudyRosterList({
  people,
  totalCount,
  groups,
  bulkMode,
  selectedIds,
  activeFilter,
  onClearFilter,
  onSelectedChange,
  onAssign,
  }: {
  people: NightStudyRosterPerson[];
  totalCount: number;
  groups: NightStudyGroupMeta[];
  bulkMode: boolean;
  selectedIds: string[];
  activeFilter: NightStudyFilter;
  onClearFilter: () => void;
  onSelectedChange: (personId: string, nextSelected: boolean) => void;
  onAssign: (personId: string, group: NightStudyAssignmentGroup) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/95 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-black/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Roster</h2>
          <p className="text-sm text-slate-600">
            Showing {people.length} of {totalCount} active cadets.
          </p>
        </div>
        {bulkMode ? (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Selection enabled
          </p>
        ) : null}
      </div>

      {people.length ? (
        <div className="divide-y divide-black/5">
          {people.map((person) => (
            <NightStudyRosterRow
              key={person.id}
              person={person}
              groups={groups}
              bulkMode={bulkMode}
              selected={selectedIds.includes(person.id)}
              onSelectedChange={(nextSelected) => onSelectedChange(person.id, nextSelected)}
              onAssign={(group) => onAssign(person.id, group)}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No personnel match your search.</p>
          <p className="mt-1 text-sm text-slate-500">
            Adjust the filter or clear the current search to see more cadets.
          </p>
          {activeFilter !== "all" ? (
            <button
              type="button"
              onClick={onClearFilter}
              className="mt-4 rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Show all groups
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
