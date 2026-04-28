import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const [session, userCount] = await Promise.all([auth(), prisma.user.count()]);

      if (userCount === 0) {
        redirect("/setup");
      }

      if (session?.user?.id) {
        redirect("/cwc/dashboard");
      }

      redirect("/cadet/login");
    },
    { fullscreen: true },
  );
}
