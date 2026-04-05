import { AnnouncementPreview } from "@/components/generators/announcement-preview";
import { getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function AnnouncementsPage() {
  const userId = await requireUser();
  const { settings, templateMap } = await getSettingsAndTemplates(userId);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Daily Announcements</h1>
        <p className="mt-2 text-sm text-slate-600">
          These messages are convenience generators. Draft values persist to your account for quick reuse.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <AnnouncementPreview
          draftType="MTR_1030"
          title="MTR 1030"
          mode="mtr"
          templateBody={templateMap.MTR_1030}
          defaultTime="1030"
          initialTime={settings.announcementMtr1030Time}
          initialLocation={settings.announcementMtr1030Location}
        />
        <AnnouncementPreview
          draftType="MTR_1630"
          title="MTR 1630"
          mode="mtr"
          templateBody={templateMap.MTR_1630}
          defaultTime="1630"
          initialTime={settings.announcementMtr1630Time}
          initialLocation={settings.announcementMtr1630Location}
        />
        <AnnouncementPreview
          draftType="LAST_PARADE_1730"
          title="Last Parade 1730"
          mode="last-parade"
          templateBody={templateMap.LAST_PARADE_1730}
          defaultTime="1730"
          requireLocation
          defaultLocation="315e"
          initialTime={settings.announcementLastParadeTime}
          initialLocation={settings.announcementLastParadeLocation}
        />
      </div>
    </div>
  );
}
