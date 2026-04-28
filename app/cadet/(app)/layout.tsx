import { redirect } from "next/navigation";

import { CadetShell } from "@/components/layout/cadet-shell";
import { requireCadetSession } from "@/lib/cadet-auth";

const CWC_APPOINTMENT_HOLDER = "CWC";

export const dynamic = "force-dynamic";

export default async function CadetAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCadetSession();

  if (session.appointmentHolder === CWC_APPOINTMENT_HOLDER) {
    redirect("/cwc/dashboard");
  }

  return (
    <CadetShell
      displayName={session.displayName}
      appointmentHolder={session.appointmentHolder}
    >
      {children}
    </CadetShell>
  );
}
