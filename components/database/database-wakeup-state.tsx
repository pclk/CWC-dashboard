"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DatabaseWakeupState({
  fullscreen = false,
}: {
  fullscreen?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [router]);

  return (
    <div
      className={
        fullscreen
          ? "mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6"
          : "flex min-h-[60vh] items-center justify-center"
      }
    >
      <section className="w-full max-w-xl rounded-[2rem] border border-amber-200 bg-white/95 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Database Status
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Waking up</h1>
        <p className="mt-3 text-sm text-slate-600" aria-live="polite">
          The database is waking up after inactivity. This page will retry automatically every 3
          seconds.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-amber-500" />
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Retry now
          </button>
        </div>
      </section>
    </div>
  );
}
