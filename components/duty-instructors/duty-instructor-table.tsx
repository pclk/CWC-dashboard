"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteDutyInstructorAction,
  upsertDutyInstructorAction,
} from "@/actions/duty-instructors";
import { formatCompactDateInputValue } from "@/lib/date";

type DutyInstructorRow = {
  id: string;
  dutyDate: Date | string;
  rank: string;
  name: string;
  reserve: string | null;
};

const EMPTY_FORM: DutyInstructorRow = {
  id: "",
  dutyDate: new Date(),
  rank: "",
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
            onClick={() => setEditingEntry({ ...EMPTY_FORM, dutyDate: new Date() })}
            className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New Entry
          </button>
        </div>
      </section>

      {editingEntry ? (
        <form
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
          className="space-y-4 rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingEntry.id ? "Edit Duty Instructor" : "Add Duty Instructor"}
              </h2>
              <p className="text-sm text-slate-600">Reserve is optional freeform text.</p>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                name="dutyDate"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="DDMMYY"
                defaultValue={formatCompactDateInputValue(new Date(editingEntry.dutyDate))}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Rank</label>
              <input
                name="rank"
                defaultValue={editingEntry.rank}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                name="name"
                defaultValue={editingEntry.name}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Reserve</label>
              <input
                name="reserve"
                defaultValue={editingEntry.reserve ?? ""}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>
          </div>

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? "Saving..." : editingEntry.id ? "Update Entry" : "Create Entry"}
          </button>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Reserve</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {dutyInstructors.length ? (
                dutyInstructors.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-slate-700">
                      {formatCompactDateInputValue(new Date(entry.dutyDate))}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.rank}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.name}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.reserve || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingEntry(entry)}
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
