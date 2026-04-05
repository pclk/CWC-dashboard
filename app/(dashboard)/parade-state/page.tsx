import { ParadeStatePreview } from "@/components/generators/parade-state-preview";
import { formatCompactDateTimeInputValue, parseSingaporeInputToUtc } from "@/lib/date";
import { buildParadeStateInput, getParadeStateSnapshots, getRecordsNeedingConfirmation, getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";

function readSingleSearchParam(value?: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ParadeStatePage({
  searchParams,
}: {
  searchParams?: Promise<{
    reportType?: string | string[];
    reportAt?: string | string[];
    reportTimeLabel?: string | string[];
    prefixOverride?: string | string[];
  }>;
}) {
  const userId = await requireUser();
  const settingsBundle = await getSettingsAndTemplates(userId);
  const params = searchParams ? await searchParams : undefined;
  const requestedReportType = readSingleSearchParam(params?.reportType);
  const requestedReportAt = readSingleSearchParam(params?.reportAt);
  const requestedReportTimeLabel = readSingleSearchParam(params?.reportTimeLabel);
  const requestedPrefixOverride = readSingleSearchParam(params?.prefixOverride);
  const storedReportType =
    settingsBundle.settings.paradeDraftReportType === "Night" ||
    settingsBundle.settings.paradeDraftReportType === "Custom"
      ? settingsBundle.settings.paradeDraftReportType
      : "Morning";
  const initialReportType =
    requestedReportType === "Night" || requestedReportType === "Custom"
      ? requestedReportType
      : requestedReportType === "Morning"
        ? "Morning"
        : storedReportType;
  const initialReportTimeLabel =
    requestedReportTimeLabel?.trim() ||
    requestedReportType?.trim() ||
    settingsBundle.settings.paradeDraftReportTimeLabel ||
    "Morning";
  const initialPrefixOverride = requestedPrefixOverride ?? settingsBundle.settings.paradeDraftPrefixOverride ?? "";

  let initialReportAt = new Date();

  try {
    initialReportAt = parseSingaporeInputToUtc(requestedReportAt) ?? initialReportAt;
  } catch {
    try {
      initialReportAt =
        parseSingaporeInputToUtc(settingsBundle.settings.paradeDraftReportAtValue) ?? initialReportAt;
    } catch {
      initialReportAt = new Date();
    }
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
