"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/actions/auth";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({
  displayName,
  email,
}: {
  displayName?: string | null;
  email?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 md:flex md:flex-col">
      <div className="sticky top-4 flex h-[calc(100vh-2rem)] min-h-0 flex-col rounded-[2rem] border border-black/10 bg-white/85 p-5 shadow-sm backdrop-blur">
        <div className="space-y-1 border-b border-black/10 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Cadet Wing Commander
          </p>
          <h2 className="text-xl font-semibold text-slate-900">Operations Dashboard</h2>
          <p className="text-sm text-slate-600">{displayName || email || "Authenticated user"}</p>
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;

            return (
              <div key={item.href} className={item.separatorBefore ? "mt-3 border-t border-black/10 pt-3" : ""}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <form action={logoutAction} className="border-t border-black/10 pt-4">
          <button
            type="submit"
            className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
