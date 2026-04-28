import { getMyCadetRequests } from "@/actions/cadet-requests";
import { CadetRequestHistory } from "@/components/cadet/request-history";
import { CadetStatusUpdateForm } from "@/components/cadet/status-update-form";

export const dynamic = "force-dynamic";

export default async function CadetStatusUpdatePage() {
  const entries = await getMyCadetRequests({ type: "MC_STATUS_UPDATE" });

  return (
    <div className="flex flex-1 flex-col gap-5">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
          Status Update
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          MC / Status Update
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use this if you&apos;ve already updated your MC or status in chat and now need to record
          it in the app. This goes straight to the CWC for approval — no instructor approval is
          needed.
        </p>
      </section>

      <CadetStatusUpdateForm />

      <CadetRequestHistory
        entries={entries}
        emptyMessage="You haven't submitted any status updates yet."
      />
    </div>
  );
}
