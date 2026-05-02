import { getCurrentInstructorOverview } from "@/actions/instructors";
import { getCetEditorPageData } from "@/actions/cet-day";
import { InstructorDashboard } from "@/components/instructors/instructor-dashboard";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const initialOverview = await getCurrentInstructorOverview();
      const initialCetData = initialOverview ? await getCetEditorPageData() : null;

      return (
        <InstructorDashboard
          initialOverview={initialOverview}
          initialCetData={initialCetData}
        />
      );
    },
    { fullscreen: true },
  );
}
