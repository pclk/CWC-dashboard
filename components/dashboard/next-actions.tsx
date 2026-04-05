"use client";

import Link from "next/link";
import { useState } from "react";

import { type DashboardNextAction } from "@/lib/dashboard-next-actions";

export function NextActions({
  currentTime,
  actions,
}: {
  currentTime: string;
  actions: DashboardNextAction[];
}) {
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);

  async function copyAction(action: DashboardNextAction) {
    await navigator.clipboard.writeText(action.copyText);
    setCopiedActionId(action.id);
    window.setTimeout(() => {
      setCopiedActionId((current) => (current === action.id ? null : current));
    }, 1500);
  }

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
      <div className="border-b border-black/10 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Next Actions</h2>
        <p className="mt-1 text-sm text-slate-600">Current time: {currentTime}</p>
      </div>

      <div className="mt-4 space-y-4">
        {actions.length ? (
          actions.map((action, index) => (
            <article
              key={action.id}
              className="rounded-[1.5rem] border-y border-black/10 bg-slate-50/70 px-4 py-4"
            >
              <p className="text-base font-semibold text-slate-900">
                {index + 1} | {action.title} {action.time}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyAction(action)}
                  className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  {copiedActionId === action.id ? "Copied" : "Copy"}
                </button>
                <Link
                  href={action.href}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {action.hrefLabel}
                </Link>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-[1.5rem] border border-dashed border-black/10 px-4 py-8 text-sm text-slate-500">
            No more scheduled actions for the rest of today.
          </p>
        )}
      </div>
    </section>
  );
}
