import Link from "next/link";

import { formatCompactDmyHm } from "@/lib/date";

type AppointmentItem = {
  id: string;
  title: string;
  venue: string | null;
  appointmentAt: Date;
  cadet: {
    rank: string;
    displayName: string;
  } | null;
};

export function TodayAppointments({ appointments }: { appointments: AppointmentItem[] }) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Today’s Appointments</h2>
          <p className="text-sm text-slate-600">Upcoming incomplete appointments, sorted ascending.</p>
        </div>
        <Link
          href="/appointments"
          className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Manage
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {appointments.length ? (
          appointments.slice(0, 8).map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3"
            >
              <p className="text-sm font-semibold text-slate-900">
                {appointment.cadet ? `${appointment.cadet.rank} ${appointment.cadet.displayName}` : "General"}
              </p>
              <p className="text-sm text-slate-700">{appointment.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatCompactDmyHm(appointment.appointmentAt)}
                {appointment.venue ? ` • ${appointment.venue}` : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-slate-500">
            No upcoming appointments for today.
          </p>
        )}
      </div>
    </section>
  );
}
