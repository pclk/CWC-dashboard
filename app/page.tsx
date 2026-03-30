import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, userCount] = await Promise.all([auth(), prisma.user.count()]);

  if (userCount === 0) {
    redirect("/setup");
  }

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  redirect("/login");
}
