"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteCurrentAffairSharingAction,
  upsertCurrentAffairSharingAction,
} from "@/actions/current-affair-sharing";
import { MessageEditor } from "@/components/generators/message-editor";
import { SearchableCombobox } from "@/components/generators/searchable-combobox";
import {
  CURRENT_AFFAIR_WEEKDAY_OPTIONS,
  formatCurrentAffairWeekday,
} from "@/lib/date";
import {
  formatCurrentAffairDateRange,
  generateCurrentAffairReminderMessage,
  generateCurrentAffairSharingMessage,
} from "@/lib/generators/current-affairs";

type CurrentAffairEntry = {
  id: string;
  sharingDate: Date | string;
  scope: "LOCAL" | "OVERSEAS" | "TBC";
  presenter: string;
  title: string;
  sortOrder: number;
};

type CurrentAffairFormState = {
  id: string;
  sharingDate: Date | string;
  scope: "LOCAL" | "OVERSEAS" | "TBC";
  presenter: string;
  title: string;
  sortOrder: number;
};

const EMPTY_FORM: CurrentAffairFormState = {
  id: "",
  sharingDate: new Date(),
  scope: "OVERSEAS",
  presenter: "",
  title: "",
  sortOrder: 0,
};

function getSharingDayValue(sharingDate: Date | string) {
  const weekday = formatCurrentAffairWeekday(new Date(sharingDate));

  return CURRENT_AFFAIR_WEEKDAY_OPTIONS.includes(
    weekday as (typeof CURRENT_AFFAIR_WEEKDAY_OPTIONS)[number],
  )
    ? weekday
    : "MON";
}

function formatScopeLabel(scope: CurrentAffairEntry["scope"]) {
  if (scope === "LOCAL") {
    return "Local";
  }

  if (scope === "OVERSEAS") {
    return "Overseas";
  }

  return "TBC";
}

export function CurrentAffairSharingSection({
  id,
  templateBody,
  reminderTemplateBody,
  sharingTime,
  entries,
  rangeStart,
  rangeEnd,
  presenterSuggestions,
}: {
  id: string;
  templateBody: string;
  reminderTemplateBody: string;
  sharingTime: string;
  entries: CurrentAffairEntry[];
  rangeStart: Date | string;
  rangeEnd: Date | string;
  presenterSuggestions: string[];
}) {
  const router = useRouter();
  const [editingEntry, setEditingEntry] = useState<CurrentAffairFormState | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dateRange = formatCurrentAffairDateRange(new Date(rangeStart), new Date(rangeEnd));
  const initialGeneratedText = generateCurrentAffairSharingMessage(templateBody, {
    dateRange,
    entries: entries.map((entry) => ({
      sharingDate: new Date(entry.sharingDate),
      scope: formatScopeLabel(entry.scope),
      presenter: entry.presenter,
      title: entry.title,
    })),
  });

  return (
    <section id={id} className="space-y-4 rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Current Affair Sharing</h2>
          <p className="text-sm text-slate-600">
            Needs at least 2 entries each week. Current week count: {entries.length}/2.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingEntry({ ...EMPTY_FORM, sharingDate: new Date() })}
          className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          New Entry
        </button>
      </div>

      {editingEntry ? (
        <form
          key={editingEntry.id || "new"}
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await upsertCurrentAffairSharingAction(formData);

              if (!result.ok) {
                setError(result.error ?? "Unable to save current affair sharing.");
                return;
              }

              setEditingEntry(null);
              router.refresh();
            });
          }}
          className="space-y-4 rounded-[1.5rem] border border-black/10 bg-slate-50 px-4 py-4"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input type="hidden" name="id" defaultValue={editingEntry.id} />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Day</label>
              <select
                name="sharingDay"
                defaultValue={getSharingDayValue(editingEntry.sharingDate)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              >
                {CURRENT_AFFAIR_WEEKDAY_OPTIONS.map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekday}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Scope</label>
              <select
                name="scope"
                defaultValue={editingEntry.scope}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              >
                <option value="LOCAL">Local</option>
                <option value="OVERSEAS">Overseas</option>
                <option value="TBC">TBC</option>
              </select>
            </div>

            <div className="space-y-2">
              <input type="hidden" name="presenter" value={editingEntry.presenter} />
              <SearchableCombobox
                label="Presenter"
                value={editingEntry.presenter}
                onValueChange={(value) =>
                  setEditingEntry((current) => (current ? { ...current, presenter: value } : current))
                }
                suggestions={presenterSuggestions}
                placeholder="Search cadet"
                emptyMessage="No cadets match the search."
                autoCapitalize="words"
              />
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Title</label>
              <input
                name="title"
                defaultValue={editingEntry.title}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Sort Order</label>
              <input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={editingEntry.sortOrder}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              {pending ? "Saving..." : editingEntry.id ? "Update Entry" : "Create Entry"}
            </button>
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        </form>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-black/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Day</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Presenter</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 bg-white">
              {entries.length ? (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-slate-700">
                      {formatCurrentAffairWeekday(new Date(entry.sharingDate))}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatScopeLabel(entry.scope)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.presenter}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.title}</td>
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
                            if (!window.confirm("Delete this current affair sharing entry?")) {
                              return;
                            }

                            setError(null);
                            startTransition(async () => {
                              const result = await deleteCurrentAffairSharingAction(formData);

                              if (!result.ok) {
                                setError(result.error ?? "Unable to delete current affair sharing.");
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
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No current affair sharing entries for this week yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MessageEditor
        initialGeneratedText={initialGeneratedText}
        getRegeneratedText={() =>
          generateCurrentAffairSharingMessage(templateBody, {
            dateRange,
            entries: entries.map((entry) => ({
              sharingDate: new Date(entry.sharingDate),
              scope: formatScopeLabel(entry.scope),
              presenter: entry.presenter,
              title: entry.title,
            })),
          })
        }
        title="Current Affair Sharing Message"
      />

      <MessageEditor
        initialGeneratedText={generateCurrentAffairReminderMessage(reminderTemplateBody, {
          time: sharingTime,
        })}
        getRegeneratedText={() =>
          generateCurrentAffairReminderMessage(reminderTemplateBody, {
            time: sharingTime,
          })
        }
        title="Current Affair Reminder"
      />
    </section>
  );
}
