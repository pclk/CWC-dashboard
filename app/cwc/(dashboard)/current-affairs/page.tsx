import { CurrentAffairSharingSection } from "@/components/current-affairs/current-affair-sharing-section";
import {
  CURRENT_AFFAIR_SECTION_ID,
  DEFAULT_ANNOUNCEMENT_TIMES,
} from "@/lib/announcement-config";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { getCurrentAffairWeekBounds } from "@/lib/date";
import {
  getCadets,
  getCurrentAffairSharingsForWeek,
  getSettingsAndTemplates,
} from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function CurrentAffairsPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const now = new Date();
    const [{ templateMap }, currentAffairEntries, cadets] = await Promise.all([
      getSettingsAndTemplates(userId),
      getCurrentAffairSharingsForWeek(userId, now),
      getCadets(userId),
    ]);
    const { start: weekStart, end: weekEnd } = getCurrentAffairWeekBounds(now);
    const presenterSuggestions = cadets
      .filter((cadet) => cadet.active)
      .map((cadet) => cadet.displayName);

    return (
      <div className="space-y-4">
        <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Current Affairs
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage weekly current affair sharings and generate the sharing and reminder messages.
          </p>
        </section>

        <CurrentAffairSharingSection
          id={CURRENT_AFFAIR_SECTION_ID}
          templateBody={templateMap.CURRENT_AFFAIR_SHARING}
          reminderTemplateBody={templateMap.CURRENT_AFFAIR_REMINDER}
          sharingTime={DEFAULT_ANNOUNCEMENT_TIMES.CURRENT_AFFAIR_SHARING}
          entries={currentAffairEntries}
          rangeStart={weekStart}
          rangeEnd={weekEnd}
          presenterSuggestions={presenterSuggestions}
        />
      </div>
    );
  });
}
