"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { cadetLogoutAction } from "@/actions/cadet-auth";
import { isActiveNavigationHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const CADET_NAV_ITEMS = [
  { href: "/cadet/dashboard", label: "Dashboard" },
  { href: "/cadet/report-sick", label: "Report Sick" },
  { href: "/cadet/status-update", label: "Status Update" },
  { href: "/cadet/night-study", label: "Night Study" },
] as const;

export function CadetShell({
  children,
  displayName,
  appointmentHolder,
}: {
  children: React.ReactNode;
  displayName: string;
  appointmentHolder?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const activeItem = CADET_NAV_ITEMS.find((item) => isActiveNavigationHref(pathname, item.href));

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeMenu = () => {
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", closeMenu);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", closeMenu);
    };
  }, [open]);

  const nav = (
    <nav className="space-y-1">
      {CADET_NAV_ITEMS.map((item) => {
        const active = isActiveNavigationHref(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition",
              active
                ? "bg-[var(--primary)] !text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const signOutForm = (
    <form action={cadetLogoutAction}>
      <button
        type="submit"
        className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Sign out
      </button>
    </form>
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-4 px-4 py-4 sm:px-5 md:gap-6 md:px-6">
        <aside className="hidden w-72 shrink-0 md:flex md:flex-col">
          <div className="sticky top-4 flex h-[calc(100vh-2rem)] min-h-0 flex-col rounded-[2rem] border border-black/10 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="space-y-1 border-b border-black/10 pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Cadet Portal
              </p>
              <h2 className="text-xl font-semibold text-slate-900">Trainee Dashboard</h2>
              <p className="text-sm text-slate-600">{displayName}</p>
              {appointmentHolder ? (
                <p className="text-xs font-medium text-slate-500">{appointmentHolder}</p>
              ) : null}
            </div>

            <div className="mt-5 flex-1 overflow-y-auto pr-1">{nav}</div>
            <div className="border-t border-black/10 pt-4">{signOutForm}</div>
          </div>
        </aside>

        <main className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col pb-6 md:pb-0">
          <div className="sticky top-4 z-30 mb-4 md:hidden">
            <div className="flex items-center gap-3 rounded-[1.75rem] border border-black/10 bg-white/88 px-3 py-3 shadow-sm backdrop-blur">
              <button
                type="button"
                aria-label={open ? "Close navigation menu" : "Open navigation menu"}
                aria-controls={drawerId}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
                  Cadet Portal
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {activeItem?.label ?? "Trainee Dashboard"}
                </p>
              </div>
            </div>
          </div>

          {children}
        </main>
      </div>

      <div className={cn("fixed inset-0 z-50 md:hidden", open ? "" : "pointer-events-none")}>
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-slate-950/28 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-label="Cadet navigation menu"
          aria-hidden={!open}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(21rem,calc(100vw-2.5rem))] max-w-full flex-col rounded-r-[2rem] border-r border-black/10 bg-[#f7f4ec]/96 shadow-2xl backdrop-blur transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
                Cadet Portal
              </p>
              <p className="truncate text-sm text-slate-600">Trainee Dashboard</p>
            </div>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-slate-700 transition hover:bg-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="border-b border-black/10 px-5 py-4">
            <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-sm text-slate-600">{appointmentHolder || "Signed in"}</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">{nav}</div>
          <div className="border-t border-black/10 p-4">{signOutForm}</div>
        </aside>
      </div>
    </div>
  );
}
