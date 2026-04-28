import { redirect } from "next/navigation";

import { CadetLoginForm } from "@/components/auth/cadet-login-form";
import { getCadetSession } from "@/lib/cadet-auth";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";

const CWC_APPOINTMENT_HOLDER = "CWC";

export const dynamic = "force-dynamic";

export default async function CadetLoginPage() {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const session = await getCadetSession();

      if (session?.appointmentHolder === CWC_APPOINTMENT_HOLDER) {
        redirect("/cwc/dashboard");
      }

      if (session) {
        redirect("/cadet/dashboard");
      }

      return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <section className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                  Trainee Access
                </p>
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Submit trainee choices without changing CWC records directly.
                </h1>
                <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
                  Sign in to access cadet-facing workflows. CWC-controlled dashboard data remains
                  under the owning batch.
                </p>
              </div>
            </section>

            <CadetLoginForm />
          </div>
        </main>
      );
    },
    { fullscreen: true },
  );
}
