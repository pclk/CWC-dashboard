"use client";

import { type NightStudyAssignmentGroup, type NightStudyGroupMeta, type NightStudyRosterPerson } from "@/lib/night-study";

import { NightStudyGroupSelector } from "@/components/night-study/night-study-group-selector";

export function NightStudyRosterRow({
  person,
  groups,
  bulkMode,
  selected,
  onSelectedChange,
  onAssign,
}: {
  person: NightStudyRosterPerson;
  groups: NightStudyGroupMeta[];
  bulkMode: boolean;
  selected: boolean;
  onSelectedChange: (nextSelected: boolean) => void;
  onAssign: (group: NightStudyAssignmentGroup) => void;
}) {
  return (
    <article className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {bulkMode ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            aria-label={`Select ${person.name}`}
            className="size-4 rounded border-black/20 text-teal-700 focus:ring-teal-700"
          />
        ) : null}

        <p className="min-w-0 truncate text-sm font-semibold text-slate-900 sm:text-base">
          {person.name}
        </p>
      </div>

      <NightStudyGroupSelector
        personName={person.name}
        groups={groups}
        currentGroup={person.assignedGroup}
        onChange={onAssign}
      />
    </article>
  );
}
