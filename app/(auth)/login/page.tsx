import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const [session, userCount] = await Promise.all([auth(), prisma.user.count()]);

      if (userCount === 0) {
        redirect("/setup");
      }

      if (session?.user?.id) {
        redirect("/dashboard");
      }

      return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <section className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                  Internal Operations
                </p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Reliable message generation for cadet wing operations.
                </h1>
                <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
                  Track cadets, operational records, appointments, parade state, troop movement,
                  and announcement templates in one protected dashboard.
                </p>
              </div>
            </section>

            <LoginForm />
          </div>
        </main>
      );
    },
    { fullscreen: true },
  );
}
