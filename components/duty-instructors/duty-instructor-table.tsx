"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  bulkDeleteDutyInstructorsAction,
  deleteDutyInstructorAction,
  upsertDutyInstructorAction,
} from "@/actions/duty-instructors";
import { formatShortDayMonth } from "@/lib/date";

type DutyInstructorRow = {
  id: string;
  dutyDate: Date | string;
  name: string;
  reserve: string | null;
};
type DutyInstructorEntryMode = "text" | "form";

const EMPTY_FORM: DutyInstructorRow = {
  id: "",
  dutyDate: new Date(),
  name: "",
  reserve: "",
};

export function DutyInstructorTable({
  dutyInstructors,
}: {
  dutyInstructors: DutyInstructorRow[];
}) {
  const router = useRouter();
  const [editingEntry, setEditingEntry] = useState<DutyInstructorRow | null>(null);
  const [entryMode, setEntryMode] = useState<DutyInstructorEntryMode>("text");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const visibleSelectedIds = selectedIds.filter((id) =>
    dutyInstructors.some((entry) => entry.id === id),
  );
  const allSelected = dutyInstructors.length > 0 && visibleSelectedIds.length === dutyInstructors.length;
  const someSelected = visibleSelectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    if (!editingEntry) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditingEntry(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editingEntry]);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Duty Instructor</h1>
            <p className="text-sm text-slate-600">
              Track daily duty instructors and their reserve coverage.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEntryMode("text");
              setEditingEntry({ ...EMPTY_FORM, dutyDate: new Date() });
            }}
            className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New Entry
          </button>
        </div>
      </section>

      {editingEntry ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="duty-instructor-modal-title"
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const result = await upsertDutyInstructorAction(formData);

                if (!result.ok) {
                  setError(result.error ?? "Unable to save duty instructor.");
                  return;
                }

                setEditingEntry(null);
                router.refresh();
              });
            }}
            className="max-h-[calc(100vh-2rem)] w-full max-w-4xl space-y-4 overflow-y-auto rounded-[2rem] border border-black/10 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="duty-instructor-modal-title" className="text-lg font-semibold text-slate-900">
                  {editingEntry.id ? "Edit Duty Instructor" : "Add Duty Instructor"}
                </h2>
                <p className="text-sm text-slate-600">Use bulk text for fast entry or form mode for one row.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <input type="hidden" name="id" defaultValue={editingEntry.id} />
            <input type="hidden" name="mode" value={editingEntry.id ? "form" : entryMode} />

            {!editingEntry.id ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEntryMode("text")}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                    entryMode === "text"
                      ? "bg-teal-700 text-white"
                      : "border border-black/10 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Text Entry
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("form")}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                    entryMode === "form"
                      ? "bg-teal-700 text-white"
                      : "border border-black/10 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Form Entry
                </button>
              </div>
            ) : null}

            {!editingEntry.id && entryMode === "text" ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Entries</label>
                <textarea
                  name="entryText"
                  rows={6}
                  placeholder={`6 Apr - A\n7 Apr - B - C\n\n13 Apr - D - E`}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                />
                <p className="text-xs text-slate-500">
                  One entry per line. Empty lines are ignored. Format: `Date - Active - Optional Reserve`.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Date</label>
                  <input
                    name="dutyDate"
                    defaultValue={formatShortDayMonth(new Date(editingEntry.dutyDate))}
                    placeholder="6 Apr"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Active</label>
                  <input
                    name="active"
                    defaultValue={editingEntry.name}
                    placeholder="Chrysanta"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Reserve</label>
                  <input
                    name="reserve"
                    defaultValue={editingEntry.reserve ?? ""}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                  />
                </div>
              </div>
            )}

            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={pending}
              className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {pending ? "Saving..." : editingEntry.id ? "Update Entry" : "Create Entry"}
            </button>
          </form>
        </div>
      ) : null}

      {!editingEntry && error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              disabled={!dutyInstructors.length || pending}
              onChange={(event) => {
                setSelectedIds(event.target.checked ? dutyInstructors.map((entry) => entry.id) : []);
              }}
              className="size-4 rounded border-black/20"
            />
            Select All
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">
              {visibleSelectedIds.length ? `${visibleSelectedIds.length} selected` : "No entries selected"}
            </span>
            <button
              type="button"
              disabled={!visibleSelectedIds.length || pending}
              onClick={() => {
                if (
                  !window.confirm(
                    `Delete ${visibleSelectedIds.length} selected duty instructor ${
                      visibleSelectedIds.length === 1 ? "entry" : "entries"
                    }?`,
                  )
                ) {
                  return;
                }

                setError(null);
                startTransition(async () => {
                  const result = await bulkDeleteDutyInstructorsAction({
                    ids: visibleSelectedIds,
                  });

                  if (!result.ok) {
                    setError(result.error ?? "Unable to delete selected duty instructors.");
                    return;
                  }

                  if (editingEntry && visibleSelectedIds.includes(editingEntry.id)) {
                    setEditingEntry(null);
                  }

                  setSelectedIds([]);
                  router.refresh();
                });
              }}
              className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Delete Selected
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Select</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Reserve</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {dutyInstructors.length ? (
                dutyInstructors.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={visibleSelectedIds.includes(entry.id)}
                        disabled={pending}
                        onChange={(event) => {
                          setSelectedIds((current) =>
                            event.target.checked
                              ? [...new Set([...current, entry.id])]
                              : current.filter((id) => id !== entry.id),
                          );
                        }}
                        className="size-4 rounded border-black/20"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatShortDayMonth(new Date(entry.dutyDate))}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.name}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.reserve || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEntryMode("form");
                            setEditingEntry(entry);
                          }}
                          className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <form
                          action={(formData) => {
                            if (!window.confirm("Delete this duty instructor entry?")) {
                              return;
                            }

                            setError(null);
                            startTransition(async () => {
                              const result = await deleteDutyInstructorAction(formData);

                              if (!result.ok) {
                                setError(result.error ?? "Unable to delete duty instructor.");
                                return;
                              }

                              if (editingEntry?.id === entry.id) {
                                setEditingEntry(null);
                              }

                              setSelectedIds((current) => current.filter((id) => id !== entry.id));
                              router.refresh();
                            });
                          }}
                        >
                          <input type="hidden" name="id" value={entry.id} />
                          <button
                            type="submit"
                            disabled={pending}
                            className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    No duty instructor entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
