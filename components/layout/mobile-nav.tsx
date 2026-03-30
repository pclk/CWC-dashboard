"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 md:hidden">
      <div className="flex gap-2 overflow-x-auto rounded-[1.75rem] border border-black/10 bg-white/95 p-2 shadow-lg backdrop-blur">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "min-w-[5.5rem] rounded-2xl px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em]",
                active ? "bg-teal-700 text-white" : "text-slate-600",
              )}
            >
              {item.shortLabel}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
