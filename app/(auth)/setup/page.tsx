import { redirect } from "next/navigation";

import { SetupForm } from "@/components/auth/setup-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
      <SetupForm />
    </main>
  );
}
