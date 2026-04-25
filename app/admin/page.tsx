import { getCurrentAdminOverview } from "@/actions/admin";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const initialOverview = await getCurrentAdminOverview();

      return <AdminDashboard initialOverview={initialOverview} />;
    },
    { fullscreen: true },
  );
}
