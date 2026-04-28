"use client";

import { useState, useTransition } from "react";

import {
  cwcApproveRequestAndCreateRecord,
  cwcDeclineRequest,
  getActiveCadetRecordsForCadet,
  type ActiveCadetRecordOption,
  type CwcPendingRequest,
} from "@/actions/cadet-requests";
import { formatDisplayDateTime } from "@/lib/date";
import { RECORD_CATEGORY_VALUES, getRecordCategoryLabel } from "@/lib/record-categories";

type CategoryValue = (typeof RECORD_CATEGORY_VALUES)[number];

type EditState = {
  category: CategoryValue;
  title: string;
  details: string;
  startAt: string;
  endAt: string;
  unknownEndTime: boolean;
  affectsStrength: boolean;
  countsNotInCamp: boolean;
};

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toEditState(request: CwcPendingRequest): EditState {
  return {
    category: RECORD_CATEGORY_VALUES.includes(request.category as CategoryValue)
      ? (request.category as CategoryValue)
      : "MC",
    title: request.title ?? "",
    details: request.details ?? "",
    startAt: toLocalInputValue(request.startAt),
    endAt: request.unknownEndTime ? "" : toLocalInputValue(request.endAt),
    unknownEndTime: request.unknownEndTime,
    affectsStrength: request.affectsStrength,
    countsNotInCamp: request.countsNotInCamp,
  };
}

function typeLabel(type: CwcPendingRequest["type"]) {
  return type === "REPORT_SICK" ? "Report Sick" : "MC / Status Update";
}

export function CwcRequestsSection({
  initialRequests,
}: {
  initialRequests: CwcPendingRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [pending, startTransition] = useTransition();
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [rowError] = useState<Record<string, string | undefined>>({});

  const [approveTarget, setApproveTarget] = useState<CwcPendingRequest | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [activeRecords, setActiveRecords] = useState<ActiveCadetRecordOption[]>([]);
  const [activeRecordsLoading, setActiveRecordsLoading] = useState(false);
  const [recordChoice, setRecordChoice] = useState<"new" | string>("new");

  const [declineTarget, setDeclineTarget] = useState<CwcPendingRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState<string | null>(null);

  const removeRequest = (requestId: string) => {
    setRequests((current) => current.filter((request) => request.requestId !== requestId));
  };

  const openApprove = (request: CwcPendingRequest) => {
    setApproveTarget(request);
    setEditState(toEditState(request));
    setApproveError(null);
    setRecordChoice("new");
    setActiveRecords([]);

    if (request.type === "MC_STATUS_UPDATE") {
      setActiveRecordsLoading(true);
      void getActiveCadetRecordsForCadet({
        cadetId: request.cadetId,
        category: request.category,
      })
        .then((records) => setActiveRecords(records))
        .catch(() => setActiveRecords([]))
        .finally(() => setActiveRecordsLoading(false));
    }
  };

  const closeApprove = () => {
    setApproveTarget(null);
    setEditState(null);
    setApproveError(null);
    setActiveRecords([]);
    setActiveRecordsLoading(false);
    setRecordChoice("new");
  };

  const openDecline = (request: CwcPendingRequest) => {
    setDeclineTarget(request);
    setDeclineReason("");
    setDeclineError(null);
  };

  const closeDecline = () => {
    setDeclineTarget(null);
    setDeclineReason("");
    setDeclineError(null);
  };

  const submitApprove = () => {
    if (!approveTarget || !editState) return;

    setBusyRequestId(approveTarget.requestId);
    setApproveError(null);

    startTransition(async () => {
      const result = await cwcApproveRequestAndCreateRecord({
        requestId: approveTarget.requestId,
        targetRecordId:
          approveTarget.type === "MC_STATUS_UPDATE" && recordChoice !== "new"
            ? recordChoice
            : undefined,
        editedRecord: {
          category: editState.category,
          title: editState.title.trim() || undefined,
          details: editState.details.trim() || undefined,
          startAt: editState.startAt
            ? new Date(editState.startAt).toISOString()
            : undefined,
          endAt:
            editState.unknownEndTime || !editState.endAt
              ? undefined
              : new Date(editState.endAt).toISOString(),
          unknownEndTime: editState.unknownEndTime,
          affectsStrength: editState.affectsStrength,
          countsNotInCamp: editState.countsNotInCamp,
        },
      });

      setBusyRequestId(null);

      if (!result.ok) {
        setApproveError(result.error ?? "Unable to approve.");
        return;
      }

      removeRequest(approveTarget.requestId);
      closeApprove();
    });
  };

  const submitDecline = () => {
    if (!declineTarget) return;
    const reason = declineReason.trim();
    if (!reason) {
      setDeclineError("Reason is required.");
      return;
    }

    const target = declineTarget;
    setBusyRequestId(target.requestId);
    setDeclineError(null);

    startTransition(async () => {
      const result = await cwcDeclineRequest({
        requestId: target.requestId,
        reason,
      });
      setBusyRequestId(null);

      if (!result.ok) {
        setDeclineError(result.error ?? "Unable to decline.");
        return;
      }

      removeRequest(target.requestId);
      closeDecline();
    });
  };

  return (
    <section className="mb-6 rounded-[2rem] border border-black/10 bg-white/92 p-5 shadow-sm">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Pending Approvals
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">CWC Requests</h2>
          <p className="mt-1 text-sm text-slate-600">
            Approve or decline cadet submissions. Approved requests create or update a CadetRecord
            and appear in the records below.
          </p>
        </div>
        <p className="text-sm text-slate-500">{requests.length} pending</p>
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-black/10 text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Cadet</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">End</th>
              <th className="px-3 py-2">Instructor</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                  No requests awaiting CWC approval.
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const isBusy = busyRequestId === request.requestId;
                const startLabel = request.startAt
                  ? formatDisplayDateTime(new Date(request.startAt))
                  : "—";
                const endLabel = request.unknownEndTime
                  ? "End TBC"
                  : request.endAt
                    ? formatDisplayDateTime(new Date(request.endAt))
                    : "—";
                const error = rowError[request.requestId];
                const instructorLabel =
                  request.type === "REPORT_SICK"
                    ? request.instructorApprovedAt
                      ? request.instructorApprovedBy
                        ? `Approved by ${request.instructorApprovedBy} · ${formatDisplayDateTime(
                            new Date(request.instructorApprovedAt),
                          )}`
                        : `Approved ${formatDisplayDateTime(new Date(request.instructorApprovedAt))}`
                      : "Awaiting instructor"
                    : "Not required";

                return (
                  <tr key={request.requestId} className="align-top">
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {typeLabel(request.type)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{request.cadetDisplayName}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {getRecordCategoryLabel(request.category)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{request.title || "—"}</td>
                    <td className="px-3 py-3 text-slate-700">
                      <span className="block max-w-[20rem] whitespace-pre-wrap break-words">
                        {request.details || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{startLabel}</td>
                    <td className="px-3 py-3 text-slate-700">{endLabel}</td>
                    <td className="px-3 py-3 text-xs text-slate-500">{instructorLabel}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={pending || isBusy}
                          onClick={() => openApprove(request)}
                          className="rounded-2xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={pending || isBusy}
                          onClick={() => openDecline(request)}
                          className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Decline
                        </button>
                        {error ? (
                          <span className="text-xs font-medium text-red-600">{error}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {approveTarget && editState ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
        >
          <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Approve & create record for {approveTarget.cadetDisplayName}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Adjust any fields before saving. The cadet record below will be created or updated.
              </p>
            </div>

            {approveTarget.type === "MC_STATUS_UPDATE" ? (
              <div className="space-y-2 rounded-2xl border border-black/10 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-700">Record target</p>
                <p className="text-xs text-slate-500">
                  Choose whether to create a new record or update an existing active record for
                  this cadet.
                </p>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="recordChoice"
                      value="new"
                      checked={recordChoice === "new"}
                      onChange={() => setRecordChoice("new")}
                      className="mt-1 h-4 w-4 accent-teal-700"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">Create new record</span>
                      <span className="block text-xs text-slate-500">
                        Adds a fresh CadetRecord using the fields below.
                      </span>
                    </span>
                  </label>

                  {activeRecordsLoading ? (
                    <p className="text-xs text-slate-500">Loading existing records…</p>
                  ) : activeRecords.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No active records in this category for this cadet.
                    </p>
                  ) : (
                    activeRecords.map((record) => {
                      const startLabel = record.startAt
                        ? formatDisplayDateTime(new Date(record.startAt))
                        : "—";
                      const endLabel = record.unknownEndTime
                        ? "End TBC"
                        : record.endAt
                          ? formatDisplayDateTime(new Date(record.endAt))
                          : "—";

                      return (
                        <label
                          key={record.id}
                          className="flex items-start gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm"
                        >
                          <input
                            type="radio"
                            name="recordChoice"
                            value={record.id}
                            checked={recordChoice === record.id}
                            onChange={() => setRecordChoice(record.id)}
                            className="mt-1 h-4 w-4 accent-teal-700"
                          />
                          <span className="space-y-1">
                            <span className="block font-medium text-slate-900">
                              Update: {getRecordCategoryLabel(record.category)}
                              {record.title ? ` — ${record.title}` : ""}
                            </span>
                            {record.details ? (
                              <span className="block text-xs text-slate-600">{record.details}</span>
                            ) : null}
                            <span className="block text-xs text-slate-500">
                              {startLabel} → {endLabel}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={editState.category}
                  onChange={(event) =>
                    setEditState((current) =>
                      current
                        ? { ...current, category: event.target.value as CategoryValue }
                        : current,
                    )
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
                >
                  {RECORD_CATEGORY_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {getRecordCategoryLabel(value)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  value={editState.title}
                  onChange={(event) =>
                    setEditState((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Details</label>
              <textarea
                value={editState.details}
                onChange={(event) =>
                  setEditState((current) =>
                    current ? { ...current, details: event.target.value } : current,
                  )
                }
                rows={3}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Start</label>
                <input
                  type="datetime-local"
                  value={editState.startAt}
                  onChange={(event) =>
                    setEditState((current) =>
                      current ? { ...current, startAt: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">End</label>
                <input
                  type="datetime-local"
                  value={editState.endAt}
                  onChange={(event) =>
                    setEditState((current) =>
                      current ? { ...current, endAt: event.target.value } : current,
                    )
                  }
                  disabled={editState.unknownEndTime}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editState.unknownEndTime}
                  onChange={(event) =>
                    setEditState((current) =>
                      current
                        ? { ...current, unknownEndTime: event.target.checked }
                        : current,
                    )
                  }
                  className="h-4 w-4 accent-teal-700"
                />
                Unknown end time
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editState.affectsStrength}
                  onChange={(event) =>
                    setEditState((current) =>
                      current
                        ? { ...current, affectsStrength: event.target.checked }
                        : current,
                    )
                  }
                  className="h-4 w-4 accent-teal-700"
                />
                Affects strength
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editState.countsNotInCamp}
                  onChange={(event) =>
                    setEditState((current) =>
                      current
                        ? { ...current, countsNotInCamp: event.target.checked }
                        : current,
                    )
                  }
                  className="h-4 w-4 accent-teal-700"
                />
                Counts not in camp
              </label>
            </div>

            {approveError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{approveError}</p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeApprove}
                disabled={pending}
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitApprove}
                disabled={pending}
                className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                {pending
                  ? "Saving..."
                  : approveTarget.type === "MC_STATUS_UPDATE" && recordChoice !== "new"
                    ? "Approve & update record"
                    : "Approve & create record"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {declineTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
        >
          <div className="w-full max-w-lg space-y-4 rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Decline request</h3>
              <p className="mt-1 text-sm text-slate-600">
                Provide a reason for declining {declineTarget.cadetDisplayName}&apos;s request.
                The cadet will see this reason.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="cwcDeclineReason">
                Reason
              </label>
              <textarea
                id="cwcDeclineReason"
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
                rows={4}
                required
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
              />
            </div>
            {declineError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{declineError}</p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDecline}
                disabled={pending}
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDecline}
                disabled={pending}
                className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Declining..." : "Decline request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
