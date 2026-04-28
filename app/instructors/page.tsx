import { getCurrentInstructorOverview } from "@/actions/instructors";
import { InstructorDashboard } from "@/components/instructors/instructor-dashboard";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const initialOverview = await getCurrentInstructorOverview();

      return <InstructorDashboard initialOverview={initialOverview} />;
    },
    { fullscreen: true },
  );
}
