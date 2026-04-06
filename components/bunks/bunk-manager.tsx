"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteBunkAction, upsertBunkAction } from "@/actions/bunks";
import { MessageEditor } from "@/components/generators/message-editor";
import {
  formatCompactDateInputValue,
  parseSingaporeDateInputToUtc,
} from "@/lib/date";
import { buildTrashIcAssignments, generateTrashIcMessage } from "@/lib/generators/trash-ic";

type BunkRow = {
  id: string;
  bunkNumber: number;
  bunkId: string;
  personnel: string[];
};

const EMPTY_FORM: BunkRow = {
  id: "",
  bunkNumber: 1,
  bunkId: "",
  personnel: [],
};

function formatPersonnelText(personnel: string[]) {
  return personnel.join("\n");
}

export function BunkManager({
  bunks,
  referenceDate,
}: {
  bunks: BunkRow[];
  referenceDate: Date | string;
}) {
  const router = useRouter();
  const [editingBunk, setEditingBunk] = useState<BunkRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const referenceDay = new Date(referenceDate);
  const [targetDateValue, setTargetDateValue] = useState(formatCompactDateInputValue(referenceDay));
  const [todayBreakfastBunkNumber, setTodayBreakfastBunkNumber] = useState(
    bunks[0] ? String(bunks[0].bunkNumber) : "",
  );
  const resolvedTodayBreakfastBunkNumber =
    todayBreakfastBunkNumber &&
    bunks.some((bunk) => String(bunk.bunkNumber) === todayBreakfastBunkNumber)
      ? todayBreakfastBunkNumber
      : bunks[0]
        ? String(bunks[0].bunkNumber)
        : "";

  let parsedTargetDate: Date | null = null;
  let targetDateError: string | null = null;

  try {
    parsedTargetDate = parseSingaporeDateInputToUtc(targetDateValue);
  } catch (currentError) {
    targetDateError =
      currentError instanceof Error ? currentError.message : "Invalid date. Use DDMMYY.";
  }

  const selectedBreakfastBunkNumber = Number(resolvedTodayBreakfastBunkNumber);
  const assignments =
    parsedTargetDate && Number.isFinite(selectedBreakfastBunkNumber)
      ? buildTrashIcAssignments({
          bunks,
          todayBreakfastBunkNumber: selectedBreakfastBunkNumber,
          targetDate: parsedTargetDate,
          todayDate: referenceDay,
        })
      : [];
  const generatedText = generateTrashIcMessage({
    targetDate: parsedTargetDate ?? referenceDay,
    assignments,
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Bunks & Trash IC</h1>
            <p className="text-sm text-slate-600">
              Maintain bunk rosters and generate rotating Trash IC assignments from today&apos;s
              breakfast bunk.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditingBunk({ ...EMPTY_FORM, bunkNumber: bunks.length ? bunks[bunks.length - 1].bunkNumber + 1 : 1 });
            }}
            className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New Bunk
          </button>
        </div>
      </section>

      {editingBunk ? (
        <form
          key={editingBunk.id || "new-bunk"}
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await upsertBunkAction(formData);

              if (!result.ok) {
                setError(result.error ?? "Unable to save bunk.");
                return;
              }

              setEditingBunk(null);
              router.refresh();
            });
          }}
          className="space-y-4 rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingBunk.id ? "Edit Bunk" : "Add Bunk"}
              </h2>
              <p className="text-sm text-slate-600">
                Enter one person per line. The line order is preserved in the generated message.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingBunk(null)}
              className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <input type="hidden" name="id" defaultValue={editingBunk.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Bunk Number</label>
              <input
                name="bunkNumber"
                type="number"
                min={1}
                defaultValue={editingBunk.bunkNumber}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Bunk ID</label>
              <input
                name="bunkId"
                defaultValue={editingBunk.bunkId}
                placeholder="3-11"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Personnel</label>
            <textarea
              name="personnelText"
              rows={6}
              defaultValue={formatPersonnelText(editingBunk.personnel)}
              placeholder={`ME4T GAVIN LEE\nME4T SIEW WEI HENG\nME4T SNG KIDD`}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? "Saving..." : editingBunk.id ? "Update Bunk" : "Create Bunk"}
          </button>
        </form>
      ) : null}

      <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Trash IC Generator</h2>
        <p className="mt-2 text-sm text-slate-600">
          Set the bunk handling today&apos;s breakfast. Lunch and dinner advance automatically, and
          future dates continue the rotation by 3 bunks per day.
        </p>

        {bunks.length ? (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Today&apos;s Breakfast Bunk</label>
                <select
                  value={resolvedTodayBreakfastBunkNumber}
                  onChange={(event) => setTodayBreakfastBunkNumber(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                >
                  {bunks.map((bunk) => (
                    <option key={bunk.id} value={bunk.bunkNumber}>
                      Bunk {bunk.bunkNumber} ({bunk.bunkId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Message Date</label>
                <input
                  value={targetDateValue}
                  onChange={(event) => setTargetDateValue(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="DDMMYY"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                />
                <p className="text-xs text-slate-500">Use DDMMYY. Example: 060426.</p>
              </div>
            </div>

            {targetDateError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {targetDateError}
              </p>
            ) : null}

            {!targetDateError && parsedTargetDate ? (
              <>
                <section className="mt-5 grid gap-4 md:grid-cols-3">
                  {assignments.map((assignment) => (
                    <article
                      key={assignment.meal}
                      className="rounded-[1.5rem] border border-black/10 bg-slate-50 px-4 py-4"
                    >
                      <p className="text-sm font-semibold text-slate-900">{assignment.meal}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        Bunk {assignment.bunk.bunkNumber}
                      </p>
                      <p className="text-sm text-slate-600">{assignment.bunk.bunkId}</p>
                      <p className="mt-3 text-sm text-slate-700">
                        {assignment.bunk.personnel.length} personnel
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {assignment.bunk.personnel.join(", ")}
                      </p>
                    </article>
                  ))}
                </section>

                <div className="mt-5">
                  <MessageEditor
                    initialGeneratedText={generatedText}
                    getRegeneratedText={() =>
                      generateTrashIcMessage({
                        targetDate: parsedTargetDate,
                        assignments: Number.isFinite(selectedBreakfastBunkNumber)
                          ? buildTrashIcAssignments({
                              bunks,
                              todayBreakfastBunkNumber: selectedBreakfastBunkNumber,
                              targetDate: parsedTargetDate,
                              todayDate: referenceDay,
                            })
                          : [],
                      })
                    }
                    title="Trash IC Message"
                  />
                </div>
              </>
            ) : null}
          </>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-black/10 px-4 py-8 text-sm text-slate-500">
            Add at least one bunk before generating Trash IC assignments.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Bunk Number</th>
                <th className="px-4 py-3 font-medium">Bunk ID</th>
                <th className="px-4 py-3 font-medium">Personnel</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {bunks.length ? (
                bunks.map((bunk) => (
                  <tr key={bunk.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{bunk.bunkNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{bunk.bunkId}</td>
                    <td className="max-w-xl px-4 py-3 text-slate-700">
                      {bunk.personnel.length ? bunk.personnel.join(", ") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setEditingBunk(bunk);
                          }}
                          className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <form
                          action={(formData) => {
                            if (!window.confirm("Delete this bunk entry?")) {
                              return;
                            }

                            setError(null);
                            startTransition(async () => {
                              const result = await deleteBunkAction(formData);

                              if (!result.ok) {
                                setError(result.error ?? "Unable to delete bunk.");
                                return;
                              }

                              if (editingBunk?.id === bunk.id) {
                                setEditingBunk(null);
                              }
                              router.refresh();
                            });
                          }}
                        >
                          <input type="hidden" name="id" value={bunk.id} />
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
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    No bunk entries yet.
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
