import { AnnouncementPreview } from "@/components/generators/announcement-preview";
import { ANNOUNCEMENT_SECTION_IDS, DEFAULT_ANNOUNCEMENT_TIMES } from "@/lib/announcement-config";
import { BookInPreview } from "@/components/generators/bookin-preview";
import { buildBookInInput, getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function BookInPage() {
  const userId = await requireUser();
  const [input, settingsBundle] = await Promise.all([
    buildBookInInput(userId),
    getSettingsAndTemplates(userId),
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Book-In</h1>
        <p className="mt-2 text-sm text-slate-600">
          A leaner operational summary generated from the same records and roster tables.
        </p>
      </section>

      <BookInPreview input={input} templateBody={settingsBundle.templateMap.BOOK_IN} />

      <AnnouncementPreview
        id={ANNOUNCEMENT_SECTION_IDS.LAST_PARADE_1730}
        draftType="LAST_PARADE_1730"
        title="Last Parade"
        mode="last-parade"
        templateBody={settingsBundle.templateMap.LAST_PARADE_1730}
        defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.LAST_PARADE_1730}
        requireLocation
        defaultLocation="315e"
        initialTime={settingsBundle.settings.announcementLastParadeTime}
        initialLocation={settingsBundle.settings.announcementLastParadeLocation}
      />
    </div>
  );
}
