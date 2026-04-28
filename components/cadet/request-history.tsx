import type { CadetRequestHistoryEntry } from "@/actions/cadet-requests";
import { formatDisplayDateTime } from "@/lib/date";
import { getRecordCategoryLabel } from "@/lib/record-categories";

function statusLabel(entry: CadetRequestHistoryEntry) {
  if (entry.status === "PENDING_INSTRUCTOR") {
    return entry.type === "REPORT_SICK"
      ? "Waiting for instructor approval"
      : "Pending";
  }

  if (entry.status === "PENDING_CWC") {
    return "Waiting for CWC approval";
  }

  if (entry.status === "APPROVED") {
    return "Approved";
  }

  if (entry.status === "DECLINED") {
    return entry.declinedByRole === "INSTRUCTOR"
      ? "Declined by instructor"
      : entry.declinedByRole === "CWC"
        ? "Declined by CWC"
        : "Declined";
  }

  return entry.status;
}

function statusTone(status: CadetRequestHistoryEntry["status"]) {
  switch (status) {
    case "APPROVED":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "DECLINED":
      return "border-red-200 bg-red-50 text-red-800";
    case "PENDING_INSTRUCTOR":
    case "PENDING_CWC":
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function typeLabel(type: CadetRequestHistoryEntry["type"]) {
  return type === "REPORT_SICK" ? "Report Sick" : "MC / Status Update";
}

function roleLabel(role: string | null) {
  if (role === "INSTRUCTOR") return "Instructor";
  if (role === "CWC") return "CWC";
  return "Request";
}

function auditDetail(label: string | null, at: string | null) {
  const displayLabel = label?.trim();
  const displayTime = at ? formatDisplayDateTime(new Date(at)) : null;

  if (displayLabel && displayTime) {
    return `${displayLabel} · ${displayTime}`;
  }

  return displayLabel ?? displayTime ?? "—";
}

export function CadetRequestHistory({
  entries,
  emptyMessage,
}: {
  entries: CadetRequestHistoryEntry[];
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return (
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Request history</h2>
        <p className="mt-2 text-sm text-slate-600">
          {emptyMessage ?? "You haven't submitted any requests yet."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Request history</h2>
      <ul className="mt-4 space-y-3">
        {entries.map((entry) => {
          const startAt = entry.startAt ? new Date(entry.startAt) : null;
          const endAt = entry.endAt ? new Date(entry.endAt) : null;
          const createdAt = new Date(entry.createdAt);

          return (
            <li
              key={entry.id}
              className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {typeLabel(entry.type)} · {getRecordCategoryLabel(entry.category)}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.title || "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(entry.status)}`}
                >
                  {statusLabel(entry)}
                </span>
              </div>

              {entry.details ? (
                <p className="mt-2 text-sm leading-6 text-slate-700">{entry.details}</p>
              ) : null}

              <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Submitted
                  </dt>
                  <dd>{formatDisplayDateTime(createdAt)}</dd>
                </div>
                {startAt ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Start
                    </dt>
                    <dd>{formatDisplayDateTime(startAt)}</dd>
                  </div>
                ) : null}
                {endAt && !entry.unknownEndTime ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                      End
                    </dt>
                    <dd>{formatDisplayDateTime(endAt)}</dd>
                  </div>
                ) : null}
                {entry.unknownEndTime ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                      End
                    </dt>
                    <dd>End TBC</dd>
                  </div>
                ) : null}
                {entry.instructorApprovedAt ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Instructor Approved
                    </dt>
                    <dd>
                      {auditDetail(entry.instructorApprovedBy, entry.instructorApprovedAt)}
                    </dd>
                  </div>
                ) : null}
                {entry.cwcApprovedAt ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                      CWC Approved
                    </dt>
                    <dd>{auditDetail(entry.cwcApprovedBy, entry.cwcApprovedAt)}</dd>
                  </div>
                ) : null}
                {entry.declinedAt ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Declined
                    </dt>
                    <dd>
                      {auditDetail(roleLabel(entry.declinedByRole), entry.declinedAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {entry.status === "DECLINED" && entry.declineReason ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50/60 px-3 py-2 text-sm text-red-800">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Reason
                  </p>
                  <p className="mt-1">{entry.declineReason}</p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
