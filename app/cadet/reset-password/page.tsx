import Link from "next/link";

import { CadetResetPasswordForm } from "@/components/auth/cadet-reset-password-form";
import { validateCadetResetToken } from "@/lib/cadet-reset";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ token?: string | string[] }>;

function reasonToMessage(reason: "NOT_FOUND" | "EXPIRED" | "REVOKED" | "INACTIVE") {
  switch (reason) {
    case "EXPIRED":
      return {
        title: "This reset link has expired",
        body: "Ask your instructor to generate a new reset link.",
      };
    case "REVOKED":
      return {
        title: "This reset link is no longer active",
        body: "Ask your instructor to generate a new reset link.",
      };
    case "INACTIVE":
      return {
        title: "Account is inactive",
        body: "Contact your instructor for assistance.",
      };
    case "NOT_FOUND":
    default:
      return {
        title: "This reset link is invalid",
        body: "Check that you used the full link from your instructor, or ask for a new one.",
      };
  }
}

function ResetShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
          Trainee Account
        </p>
        {children}
      </div>
    </main>
  );
}

export default async function CadetResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return renderWithDatabaseWakeupFallback(
    async () => {
      const params = await searchParams;
      const rawToken = params.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

      if (!token) {
        const message = reasonToMessage("NOT_FOUND");
        return (
          <ResetShell>
            <div className="rounded-3xl border border-red-200 bg-white/90 p-6 shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">{message.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{message.body}</p>
              <Link
                href="/cadet/login"
                className="mt-4 inline-flex rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back to sign in
              </Link>
            </div>
          </ResetShell>
        );
      }

      const validation = await validateCadetResetToken(token);

      if (!validation.ok) {
        const message = reasonToMessage(validation.reason);
        return (
          <ResetShell>
            <div className="rounded-3xl border border-red-200 bg-white/90 p-6 shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">{message.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{message.body}</p>
              <Link
                href="/cadet/login"
                className="mt-4 inline-flex rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back to sign in
              </Link>
            </div>
          </ResetShell>
        );
      }

      return (
        <ResetShell>
          <CadetResetPasswordForm token={token} displayName={validation.cadet.displayName} />
        </ResetShell>
      );
    },
    { fullscreen: true },
  );
}
