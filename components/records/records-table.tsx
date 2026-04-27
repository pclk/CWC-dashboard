"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteRecordAction } from "@/actions/records";
import { formatCompactDmy } from "@/lib/date";
import { getRecordCategoryLabel, RECORD_CATEGORY_VALUES } from "@/lib/record-categories";
import { ConfirmResolveDialog } from "@/components/records/confirm-resolve-dialog";
import { RecordForm } from "@/components/records/record-form";

type CadetOption = {
  id: string;
  rank: string;
  displayName: string;
  active: boolean;
};

type RecordRow = {
  id: string;
  cadetId: string;
  category: string;
  title: string | null;
  details: string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
  unknownEndTime: boolean;
  affectsStrength: boolean;
  countsNotInCamp: boolean;
  resolutionState: "ACTIVE" | "EXPIRED_PENDING_CONFIRMATION" | "RESOLVED";
  sortOrder: number;
  cadet: {
    rank: string;
    displayName: string;
  };
};

export function RecordsTable({
  cadets,
  records,
}: {
  cadets: CadetOption[];
  records: RecordRow[];
}) {
  const router = useRouter();
  const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
  const [tab, setTab] = useState<"ACTIVE" | "EXPIRED_PENDING_CONFIRMATION" | "RESOLVED">("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [cadetFilter, setCadetFilter] = useState("ALL");
  const [pending, startTransition] = useTransition();

  const filteredRecords = records.filter((record) => {
    const tabMatch = record.resolutionState === tab;
    const categoryMatch = categoryFilter === "ALL" || record.category === categoryFilter;
    const cadetMatch = cadetFilter === "ALL" || record.cadetId === cadetFilter;

    return tabMatch && categoryMatch && cadetMatch;
  });

  useEffect(() => {
    if (!editingRecord) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditingRecord(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editingRecord]);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Records</h1>
            <p className="text-sm text-slate-600">
              Track operational absences, restrictions, and manual confirmation workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingRecord({
                id: "",
                cadetId: "",
                category: "MC",
                title: "",
                details: "",
                startAt: null,
                endAt: null,
                unknownEndTime: false,
                affectsStrength: true,
                countsNotInCamp: true,
                resolutionState: "ACTIVE",
                sortOrder: 0,
                cadet: { rank: "", displayName: "" },
              })
            }
            className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New Record
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { key: "ACTIVE", label: "Active" },
            { key: "EXPIRED_PENDING_CONFIRMATION", label: "Needs Confirmation" },
            { key: "RESOLVED", label: "Resolved" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                tab === item.key
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
          >
            <option value="ALL">All categories</option>
            {RECORD_CATEGORY_VALUES.map((option) => (
              <option key={option} value={option}>
                {getRecordCategoryLabel(option)}
              </option>
            ))}
          </select>

          <select
            value={cadetFilter}
            onChange={(event) => setCadetFilter(event.target.value)}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
          >
            <option value="ALL">All cadets</option>
            {cadets.map((cadet) => (
              <option key={cadet.id} value={cadet.id}>
                {cadet.rank} {cadet.displayName}
              </option>
            ))}
          </select>
        </div>
      </section>

      {editingRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto">
            <RecordForm
              key={editingRecord.id || "new-record"}
              cadets={cadets}
              record={editingRecord.id ? editingRecord : null}
              onCancel={() => setEditingRecord(null)}
            />
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Cadet</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredRecords.length ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {record.cadet.rank} {record.cadet.displayName}
                    </td>
                    <td className="px-4 py-3">{getRecordCategoryLabel(record.category)}</td>
                    <td className="max-w-sm px-4 py-3 text-slate-600">
                      <div>{record.title || "-"}</div>
                      {record.details ? <div className="mt-1 text-xs text-slate-500">{record.details}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {record.unknownEndTime
                        ? "TBC"
                        : record.endAt
                          ? formatCompactDmy(new Date(record.endAt))
                          : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{record.affectsStrength ? "Strength" : "No strength effect"}</div>
                      <div className="text-xs">
                        {record.countsNotInCamp ? "Counts not in camp" : "No NIC count"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          record.resolutionState === "EXPIRED_PENDING_CONFIRMATION"
                            ? "bg-amber-100 text-amber-800"
                            : record.resolutionState === "RESOLVED"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {record.resolutionState === "EXPIRED_PENDING_CONFIRMATION"
                          ? "Needs confirmation"
                          : record.resolutionState === "RESOLVED"
                            ? "Resolved"
                            : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRecord(record)}
                          className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>

                        {record.resolutionState === "EXPIRED_PENDING_CONFIRMATION" ? (
                          <ConfirmResolveDialog
                            recordId={record.id}
                            onExtend={() => setEditingRecord(record)}
                          />
                        ) : null}

                        <form
                          action={(formData) => {
                            if (!window.confirm("Delete this record? This changes strength history.")) {
                              return;
                            }

                            startTransition(async () => {
                              const result = await deleteRecordAction(formData);

                              if (result.ok) {
                                router.refresh();
                                if (editingRecord?.id === record.id) {
                                  setEditingRecord(null);
                                }
                              }
                            });
                          }}
                        >
                          <input type="hidden" name="id" value={record.id} />
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
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No records match the selected filters.
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
