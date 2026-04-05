import { ParadeStatePreview } from "@/components/generators/parade-state-preview";
import { formatCompactDateTimeInputValue, parseSingaporeInputToUtc } from "@/lib/date";
import { buildParadeStateInput, getParadeStateSnapshots, getRecordsNeedingConfirmation, getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function ParadeStatePage() {
  const userId = await requireUser();
  const settingsBundle = await getSettingsAndTemplates(userId);
  const initialReportType =
    settingsBundle.settings.paradeDraftReportType === "Night" ||
    settingsBundle.settings.paradeDraftReportType === "Custom"
      ? settingsBundle.settings.paradeDraftReportType
      : "Morning";
  const initialReportTimeLabel = settingsBundle.settings.paradeDraftReportTimeLabel ?? "Morning";
  const initialPrefixOverride = settingsBundle.settings.paradeDraftPrefixOverride ?? "";

  let initialReportAt = new Date();

  try {
    initialReportAt = parseSingaporeInputToUtc(settingsBundle.settings.paradeDraftReportAtValue) ?? initialReportAt;
  } catch {
    initialReportAt = new Date();
  }
  const initialReportAtValue = formatCompactDateTimeInputValue(initialReportAt);

  const [initialInput, history, dueConfirmations] = await Promise.all([
    buildParadeStateInput(userId, {
      reportType: initialReportType,
      reportAt: initialReportAt,
      reportTimeLabel: initialReportTimeLabel,
      prefixOverride: initialPrefixOverride,
    }),
    getParadeStateSnapshots(userId),
    getRecordsNeedingConfirmation(userId),
  ]);

  return (
    <ParadeStatePreview
      initialInput={initialInput}
      morningTemplate={settingsBundle.templateMap.PARADE_MORNING}
      nightTemplate={settingsBundle.templateMap.PARADE_NIGHT}
      initialReportType={initialReportType}
      initialReportAtValue={initialReportAtValue}
      initialReportTimeLabel={initialReportTimeLabel}
      initialPrefixOverride={initialPrefixOverride}
      dueConfirmationCount={dueConfirmations.length}
      history={history}
    />
  );
}
