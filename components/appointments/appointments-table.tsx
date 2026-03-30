"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteAppointmentAction } from "@/actions/appointments";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { formatCompactDmyHm } from "@/lib/date";

type CadetOption = {
  id: string;
  rank: string;
  displayName: string;
  active: boolean;
};

type AppointmentRow = {
  id: string;
  cadetId: string | null;
  title: string;
  venue: string | null;
  appointmentAt: Date | string;
  notes: string | null;
  completed: boolean;
  cadet: {
    rank: string;
    displayName: string;
  } | null;
};

export function AppointmentsTable({
  cadets,
  appointments,
}: {
  cadets: CadetOption[];
  appointments: AppointmentRow[];
}) {
  const router = useRouter();
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED">("UPCOMING");
  const [pending, startTransition] = useTransition();

  const filteredAppointments = appointments.filter((appointment) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "UPCOMING") return !appointment.completed;
    return appointment.completed;
  });

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Appointments</h1>
            <p className="text-sm text-slate-600">Track future reviews, interviews, and other time-bound tasks.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditingAppointment({
                id: "",
                cadetId: "",
                title: "",
                venue: "",
                appointmentAt: new Date(),
                notes: "",
                completed: false,
                cadet: null,
              })
            }
            className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New Appointment
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { key: "UPCOMING", label: "Upcoming" },
            { key: "COMPLETED", label: "Completed" },
            { key: "ALL", label: "All" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key as typeof statusFilter)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                statusFilter === item.key
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {editingAppointment ? (
        <AppointmentForm
          key={editingAppointment.id || "new-appointment"}
          cadets={cadets}
          appointment={editingAppointment.id ? editingAppointment : null}
          onCancel={() => setEditingAppointment(null)}
        />
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Cadet</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Venue</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredAppointments.length ? (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {appointment.cadet
                        ? `${appointment.cadet.rank} ${appointment.cadet.displayName}`
                        : "General"}
                    </td>
                    <td className="px-4 py-3">{appointment.title}</td>
                    <td className="px-4 py-3 text-slate-600">{appointment.venue || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatCompactDmyHm(new Date(appointment.appointmentAt))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          appointment.completed
                            ? "bg-slate-200 text-slate-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {appointment.completed ? "Completed" : "Upcoming"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAppointment(appointment)}
                          className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>

                        <form
                          action={(formData) => {
                            if (!window.confirm("Delete this appointment?")) {
                              return;
                            }

                            startTransition(async () => {
                              const result = await deleteAppointmentAction(formData);

                              if (result.ok) {
                                router.refresh();
                                if (editingAppointment?.id === appointment.id) {
                                  setEditingAppointment(null);
                                }
                              }
                            });
                          }}
                        >
                          <input type="hidden" name="id" value={appointment.id} />
                          <button
                            type="submit"
                            disabled={pending}
                            className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No appointments match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
