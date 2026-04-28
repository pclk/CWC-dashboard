import { AppShell } from "@/components/layout/app-shell";
import { requireCwcUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCwcUser();

  return <AppShell user={user}>{children}</AppShell>;
}
