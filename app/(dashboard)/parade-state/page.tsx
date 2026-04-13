import { ParadeStatePreview } from "@/components/generators/parade-state-preview";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { formatCompactDateTimeInputValue, parseSingaporeInputToUtc } from "@/lib/date";
import { getDefaultParadeReportAtValue } from "@/lib/generators/parade-state";
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
  }>;
}) {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const settingsBundle = await getSettingsAndTemplates(userId);
    const params = searchParams ? await searchParams : undefined;
    const requestedReportType = readSingleSearchParam(params?.reportType);
    const requestedReportAt = readSingleSearchParam(params?.reportAt);
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
    const initialReportAtValue = resolveInitialReportAtValue(
      initialReportType,
      requestedReportAt,
      settingsBundle.settings.paradeDraftReportAtValue,
    );
    const initialReportAt = parseSingaporeInputToUtc(initialReportAtValue) ?? new Date();

    const [initialInput, history, dueConfirmations] = await Promise.all([
      buildParadeStateInput(userId, {
        reportType: initialReportType,
        reportAt: initialReportAt,
      }),
      getParadeStateSnapshots(userId),
      getRecordsNeedingConfirmation(userId),
    ]);

    return (
      <ParadeStatePreview
        initialInput={initialInput}
        templateBody={settingsBundle.templateMap.PARADE_MORNING}
        initialReportType={initialReportType}
        initialReportAtValue={initialReportAtValue}
        dueConfirmationCount={dueConfirmations.length}
        history={history}
      />
    );
  });
}

function resolveInitialReportAtValue(
  reportType: "Morning" | "Night" | "Custom",
  requestedReportAt?: string | null,
  storedReportAt?: string | null,
) {
  const requestedValue = formatParsedReportAtValue(requestedReportAt);

  if (requestedValue) {
    return requestedValue;
  }

  const storedValue = formatParsedReportAtValue(storedReportAt);

  if (storedValue) {
    return storedValue;
  }

  return getDefaultParadeReportAtValue(reportType);
}

function formatParsedReportAtValue(value?: string | null) {
  try {
    const parsed = parseSingaporeInputToUtc(value);
    return parsed ? formatCompactDateTimeInputValue(parsed) : null;
  } catch {
    return null;
  }
}
