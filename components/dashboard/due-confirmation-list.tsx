import Link from "next/link";

import { formatCompactDmy } from "@/lib/date";
import { getRecordCategoryLabel } from "@/lib/record-categories";

type DueRecord = {
  id: string;
  category: string;
  title: string | null;
  details: string | null;
  endAt: Date | null;
  cadet: {
    displayName: string;
  };
};

export function DueConfirmationList({ records }: { records: DueRecord[] }) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Needs Confirmation</h2>
          <p className="text-sm text-slate-600">
            Records do not disappear automatically after their end date passes.
          </p>
        </div>
        <Link
          href="/cwc/records"
          className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Open records
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {records.length ? (
          records.slice(0, 8).map((record) => (
            <div
              key={record.id}
              className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {record.cadet.displayName}
                </p>
                <p className="text-sm text-slate-700">
                  {getRecordCategoryLabel(record.category)}
                  {record.title ? ` • ${record.title}` : ""}
                </p>
              </div>
              <div className="text-sm text-amber-800">
                {record.endAt ? `Ended ${formatCompactDmy(record.endAt)}` : "End date not set"}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-slate-500">
            No records are waiting for manual confirmation.
          </p>
        )}
      </div>
    </section>
  );
}
