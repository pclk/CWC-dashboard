import Link from "next/link";

import { DueConfirmationList } from "@/components/dashboard/due-confirmation-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import { getDashboardData } from "@/lib/db";
import { requireUser } from "@/lib/session";

const quickActions = [
  { href: "/parade-state", label: "Generate Parade State" },
  { href: "/troop-movement", label: "Generate Troop Movement" },
  { href: "/book-in", label: "Generate Book-In" },
  { href: "/announcements", label: "Generate Daily Announcement" },
];

export default async function DashboardPage() {
  const userId = await requireUser();
  const { summary, dueConfirmations, todayAppointments } = await getDashboardData(userId);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Operations Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Surface only the operational items that need attention now. Use the quick actions below
          to generate messages without navigating through the full record tables first.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current Strength" value={`${summary.presentStrength}`} hint="Present and operationally available" />
        <StatCard label="Total Strength" value={`${summary.totalStrength}`} hint="Active cadets in roster" />
        <StatCard
          label="Not In Camp"
          value={`${
            summary.notInCampCounts.hospitalizationLeave +
            summary.notInCampCounts.rso +
            summary.notInCampCounts.mc +
            summary.notInCampCounts.other
          }`}
          hint="Distinct cadets currently flagged not in camp"
        />
        <StatCard
          label="Needs Confirmation"
          value={`${dueConfirmations.length}`}
          hint="Expired records still awaiting manual closure"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DueConfirmationList records={dueConfirmations} />
        <TodayAppointments appointments={todayAppointments} />
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-[1.5rem] bg-teal-700 px-5 py-6 text-base font-semibold text-white transition hover:bg-teal-800"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
