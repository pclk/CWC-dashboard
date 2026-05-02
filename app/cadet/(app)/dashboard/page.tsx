import { CadetCetTimelineTabs } from "@/components/cadet/cadet-cet-timeline-tabs";
import { requireCadetSession } from "@/lib/cadet-auth";
import { getSingaporeIsoDate, getSingaporeToday, getSingaporeTomorrow } from "@/lib/cet";
import {
  getCetCadetNotificationState,
  getCetTimelineForCadet,
  markCetDateViewed,
} from "@/lib/cet-read";

export default async function CadetDashboardPage() {
  const session = await requireCadetSession();
  const now = new Date();
  const today = getSingaporeToday(now);
  const tomorrow = getSingaporeTomorrow(now);
  const [todayBlocks, tomorrowBlocks, todayNotifications, tomorrowNotifications] =
    await Promise.all([
      getCetTimelineForCadet(session.userId, session.cadetId, today),
      getCetTimelineForCadet(session.userId, session.cadetId, tomorrow),
      getCetCadetNotificationState(session.userId, session.cadetId, today),
      getCetCadetNotificationState(session.userId, session.cadetId, tomorrow),
    ]);

  await Promise.all([
    markCetDateViewed(session.userId, session.cadetId, today),
    markCetDateViewed(session.userId, session.cadetId, tomorrow),
  ]);

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
          View your CET schedule and submit trainee-facing updates without editing CWC dashboard
          records.
        </p>
      </section>

      <CadetCetTimelineTabs
        days={[
          {
            key: "today",
            label: "Today",
            date: getSingaporeIsoDate(today),
            blocks: todayBlocks,
            hasUpdates: todayNotifications.hasUpdates,
          },
          {
            key: "tomorrow",
            label: "Tomorrow",
            date: getSingaporeIsoDate(tomorrow),
            blocks: tomorrowBlocks,
            hasUpdates: tomorrowNotifications.hasUpdates,
          },
        ]}
      />
    </div>
  );
}
