import { getCurrentAdminPanelState } from "@/actions/admin";
import { AdminPanel } from "@/components/admin/admin-panel";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const initialState = await getCurrentAdminPanelState();

      return <AdminPanel initialState={initialState} />;
    },
    { fullscreen: true },
  );
}
