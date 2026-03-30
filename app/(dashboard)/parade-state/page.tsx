import { ParadeStatePreview } from "@/components/generators/parade-state-preview";
import { buildParadeStateInput, getParadeStateSnapshots, getRecordsNeedingConfirmation, getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function ParadeStatePage() {
  const userId = await requireUser();
  const [settingsBundle, initialInput, history, dueConfirmations] = await Promise.all([
    getSettingsAndTemplates(userId),
    buildParadeStateInput(userId, {
      reportType: "Morning",
      reportTimeLabel: "Morning",
    }),
    getParadeStateSnapshots(userId),
    getRecordsNeedingConfirmation(userId),
  ]);

  return (
    <ParadeStatePreview
      initialInput={initialInput}
      morningTemplate={settingsBundle.templateMap.PARADE_MORNING}
      nightTemplate={settingsBundle.templateMap.PARADE_NIGHT}
      defaultMorningPrefix={
        settingsBundle.settings.defaultParadePrefix ??
        "Good morning sirs and ma'am, this is the parade state for {{unitName}}."
      }
      defaultNightPrefix={
        settingsBundle.settings.defaultNightPrefix ??
        "Good evening sirs and ma'am, this is the parade state for {{unitName}}."
      }
      dueConfirmationCount={dueConfirmations.length}
      history={history}
    />
  );
}
