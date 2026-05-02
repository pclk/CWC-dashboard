import { CetEditor } from "@/components/cet/cet-editor";
import {
  getSingaporeIsoDate,
  getSingaporeToday,
} from "@/lib/cet";
import { getCetEditorPageData } from "@/actions/cet-day";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { requireCwcUser } from "@/lib/session";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readSingleSearchParam(value?: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveSelectedDate(value?: string | null) {
  if (value && ISO_DATE_PATTERN.test(value)) {
    return value;
  }

  return getSingaporeIsoDate(getSingaporeToday());
}

export default async function CwcCetPage({
  searchParams,
}: {
  searchParams?: Promise<{
    date?: string | string[];
  }>;
}) {
  return renderWithDatabaseWakeupFallback(async () => {
    await requireCwcUser();
    const params = searchParams ? await searchParams : undefined;
    const selectedDate = resolveSelectedDate(readSingleSearchParam(params?.date));
    const cetData = await getCetEditorPageData(selectedDate);

    return (
      <CetEditor
        selectedDate={cetData.selectedDate}
        previousWeekDate={cetData.previousWeekDate}
        nextWeekDate={cetData.nextWeekDate}
        editorData={cetData.editorData}
        timeline={cetData.timeline}
        templateHref="/cwc/cet/templates"
      />
    );
  });
}
