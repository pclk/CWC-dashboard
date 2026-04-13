import { AppointmentsTable } from "@/components/appointments/appointments-table";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { getAppointments, getCadets } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function AppointmentsPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const [cadets, appointments] = await Promise.all([getCadets(userId), getAppointments(userId)]);

    return <AppointmentsTable cadets={cadets} appointments={appointments} />;
  });
}
