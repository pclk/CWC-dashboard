import { AnnouncementPreview } from "@/components/generators/announcement-preview";
import { PermissionRequestPreview } from "@/components/generators/permission-request-preview";
import {
  ANNOUNCEMENT_SECTION_IDS,
  DEFAULT_ANNOUNCEMENT_TIMES,
} from "@/lib/announcement-config";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import {
  getDutyInstructorForDate,
  getSettingsAndTemplates,
} from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function AnnouncementsPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const now = new Date();
    const [{ settings, templateMap }, dutyInstructor] = await Promise.all([
      getSettingsAndTemplates(userId),
      getDutyInstructorForDate(userId, now),
    ]);
    const dutyInstructorActive = dutyInstructor?.name ?? null;
    const dutyInstructorReserve = dutyInstructor?.reserve ?? null;

    return (
      <div className="space-y-4">
        <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Daily Announcements
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            These messages are convenience generators. Draft values persist to your account for
            quick reuse.
          </p>
        </section>

        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <PermissionRequestPreview
            id={ANNOUNCEMENT_SECTION_IDS.REQUEST_DI_FP}
            draftType="REQUEST_DI_FP"
            title="Request DI for FP"
            templateBody={templateMap.REQUEST_DI_FP}
            cohortName={settings.unitName}
            defaultRecipient="sir"
            defaultLocation="under block 315e"
            defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.FIRST_PARADE}
            initialRecipient={settings.announcementRequestDiRecipient}
            initialName={settings.announcementRequestDiName}
            initialLocation={settings.announcementRequestDiLocation}
            initialTime={settings.announcementRequestDiTime}
            initialFirstTime={settings.announcementRequestDiFirstTime}
            dutyInstructorActive={dutyInstructorActive}
            dutyInstructorReserve={dutyInstructorReserve}
          />
          <AnnouncementPreview
            id={ANNOUNCEMENT_SECTION_IDS.FIRST_PARADE}
            draftType="FIRST_PARADE"
            title="First Parade"
            mode="routine"
            templateBody={templateMap.FIRST_PARADE}
            defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.FIRST_PARADE}
            initialTime={settings.announcementFirstParadeTime}
          />
          <AnnouncementPreview
            id={ANNOUNCEMENT_SECTION_IDS.PT}
            draftType="PT"
            title="PT"
            mode="routine-with-activity"
            templateBody={templateMap.PT}
            defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.PT}
            initialTime={settings.announcementPtTime}
            defaultActivity="DI"
            initialActivity={settings.announcementPtActivity}
          />
          <AnnouncementPreview
            id={ANNOUNCEMENT_SECTION_IDS.MORNING_LAB}
            draftType="MORNING_LAB"
            title="Morning Lab"
            mode="routine"
            templateBody={templateMap.MORNING_LAB}
            defaultTime="0745"
            initialTime={settings.announcementMorningLabTime}
            initialIsPtDay={settings.announcementMorningLabIsPt}
            enablePtDayToggle
          />
          <AnnouncementPreview
            id={ANNOUNCEMENT_SECTION_IDS.MTR_1030}
            draftType="MTR_1030"
            title="MTR (Lunch)"
            mode="mtr"
            templateBody={templateMap.MTR_1030}
            defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.MTR_1030}
            initialTime={settings.announcementMtr1030Time}
            initialLocation={settings.announcementMtr1030Location}
          />
          <AnnouncementPreview
            id={ANNOUNCEMENT_SECTION_IDS.MTR_1630}
            draftType="MTR_1630"
            title="MTR (Dinner)"
            mode="mtr"
            templateBody={templateMap.MTR_1630}
            defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.MTR_1630}
            initialTime={settings.announcementMtr1630Time}
            initialLocation={settings.announcementMtr1630Location}
          />
          <PermissionRequestPreview
            id={ANNOUNCEMENT_SECTION_IDS.REQUEST_LP}
            draftType="REQUEST_LP"
            title="Request DI for LP"
            templateBody={templateMap.REQUEST_LP}
            cohortName={settings.unitName}
            defaultRecipient="ma'am"
            defaultLocation="outside spectrum mess"
            defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.REQUEST_LP}
            initialRecipient={settings.announcementRequestLpRecipient}
            initialName={settings.announcementRequestLpName}
            initialLocation={settings.announcementRequestLpLocation}
            initialTime={settings.announcementRequestLpTime}
            initialFirstTime={settings.announcementRequestLpFirstTime}
            dutyInstructorActive={dutyInstructorActive}
            dutyInstructorReserve={dutyInstructorReserve}
          />
          <AnnouncementPreview
            id={ANNOUNCEMENT_SECTION_IDS.LAST_PARADE_1730}
            draftType="LAST_PARADE_1730"
            title="Last Parade"
            mode="last-parade"
            templateBody={templateMap.LAST_PARADE_1730}
            defaultTime={DEFAULT_ANNOUNCEMENT_TIMES.LAST_PARADE_1730}
            defaultLocation="Under Block 315e"
            initialTime={settings.announcementLastParadeTime}
            initialLocation={settings.announcementLastParadeLocation}
          />
        </div>
      </div>
    );
  });
}
