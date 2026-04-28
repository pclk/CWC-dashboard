import { RecordsTable } from "@/components/records/records-table";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { getAllRecords, getCadets } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function RecordsPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const [cadets, records] = await Promise.all([getCadets(userId), getAllRecords(userId)]);

    return <RecordsTable cadets={cadets} records={records} />;
  });
}
