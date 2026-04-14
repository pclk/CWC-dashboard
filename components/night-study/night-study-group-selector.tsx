"use client";

import { Check } from "lucide-react";

import {
  type NightStudyAssignmentGroup,
  type NightStudyGroupMeta,
} from "@/lib/night-study";
import { cn } from "@/lib/utils";

export function NightStudyGroupSelector({
  personName,
  groups,
  currentGroup,
  onChange,
}: {
  personName: string;
  groups: NightStudyGroupMeta[];
  currentGroup: NightStudyAssignmentGroup;
  onChange: (group: NightStudyAssignmentGroup) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Assign ${personName}`}
      className="grid grid-cols-4 gap-1.5 sm:gap-2"
    >
      {groups.map((group) => {
        const isSelected = currentGroup === group.id;

        return (
          <button
            key={group.id}
            type="button"
            aria-pressed={isSelected}
            title={`Assign ${personName} to ${group.label}`}
            onClick={() => onChange(group.id)}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:text-sm",
              isSelected
                ? "border border-teal-700 bg-teal-700 text-white"
                : "border border-black/10 bg-white text-slate-700 hover:bg-slate-100",
            )}
          >
            {isSelected ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
            <span className="sm:hidden">{group.shortLabel}</span>
            <span className="hidden sm:inline">{group.label}</span>
          </button>
        );
      })}
    </div>
  );
}
