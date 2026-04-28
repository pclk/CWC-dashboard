import { CadetTable } from "@/components/cadets/cadet-table";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { getCadets } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function CadetsPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const cadets = await getCadets(userId);

    return <CadetTable cadets={cadets} />;
  });
}
