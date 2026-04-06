import { DutyInstructorTable } from "@/components/duty-instructors/duty-instructor-table";
import { getDutyInstructors } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function DutyInstructorsPage() {
  const userId = await requireUser();
  const dutyInstructors = await getDutyInstructors(userId);

  return <DutyInstructorTable dutyInstructors={dutyInstructors} />;
}
