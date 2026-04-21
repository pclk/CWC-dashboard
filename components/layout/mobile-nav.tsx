"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { logoutAction } from "@/actions/auth";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav({
  displayName,
  email,
}: {
  displayName?: string | null;
  email?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const activeItem = NAV_ITEMS.find((item) => item.href === pathname);

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

  return (
    <>
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
              Cadet Wing Commander
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {activeItem?.label ?? "Operations Dashboard"}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "" : "pointer-events-none",
        )}
      >
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
          aria-label="Navigation menu"
          aria-hidden={!open}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(21rem,calc(100vw-2.5rem))] max-w-full flex-col rounded-r-[2rem] border-r border-black/10 bg-[#f7f4ec]/96 shadow-2xl backdrop-blur transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
                Cadet Wing Commander
              </p>
              <p className="truncate text-sm text-slate-600">Operations Dashboard</p>
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
            <p className="truncate text-base font-semibold text-slate-900">
              {displayName || "Authenticated user"}
            </p>
            <p className="truncate text-sm text-slate-600">{email || "Signed in"}</p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;

              return (
                <div key={item.href} className={item.separatorBefore ? "mt-3 border-t border-black/10 pt-3" : ""}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-teal-700 !text-white shadow-sm"
                        : "text-slate-700 hover:bg-white/80 hover:text-slate-900",
                    )}
                  >
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>

          <form action={logoutAction} className="border-t border-black/10 p-4">
            <button
              type="submit"
              className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Sign out
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
