import { CetTimeline } from "@/components/cadet/cet-timeline";
import { requireCadetSession } from "@/lib/cadet-auth";

export default async function CadetDashboardPage() {
  const session = await requireCadetSession();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
          Cadet Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Welcome back, {session.displayName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use the cadet portal to submit trainee-facing updates. Report Sick and Night Study
          workflows will be added here without directly editing CWC dashboard records.
        </p>
      </section>

      <CetTimeline />
    </div>
  );
}
