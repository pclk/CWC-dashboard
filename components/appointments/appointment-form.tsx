"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { upsertAppointmentAction } from "@/actions/appointments";
import { CadetSelectField } from "@/components/cadets/cadet-select-field";
import { formatCompactDateTimeInputValue } from "@/lib/date";

type CadetOption = {
  id: string;
  rank: string;
  displayName: string;
  active: boolean;
};

type AppointmentValues = {
  id: string;
  cadetId: string | null;
  title: string;
  venue: string | null;
  appointmentAt: Date | string;
  notes: string | null;
  affectsMorningStrength: boolean;
  affectsAfternoonStrength: boolean;
  affectsEveningStrength: boolean;
  completed: boolean;
};

export function AppointmentForm({
  cadets,
  appointment,
  onCancel,
}: {
  cadets: CadetOption[];
  appointment?: AppointmentValues | null;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [affectsMorningStrength, setAffectsMorningStrength] = useState(
    appointment?.affectsMorningStrength ?? false,
  );
  const [affectsAfternoonStrength, setAffectsAfternoonStrength] = useState(
    appointment?.affectsAfternoonStrength ?? false,
  );
  const [affectsEveningStrength, setAffectsEveningStrength] = useState(
    appointment?.affectsEveningStrength ?? false,
  );
  const [completed, setCompleted] = useState(appointment?.completed ?? false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);

        startTransition(async () => {
          formData.set("affectsMorningStrength", String(affectsMorningStrength));
          formData.set("affectsAfternoonStrength", String(affectsAfternoonStrength));
          formData.set("affectsEveningStrength", String(affectsEveningStrength));
          formData.set("completed", String(completed));
          const result = await upsertAppointmentAction(formData);

          if (!result.ok) {
            setError(result.error ?? "Unable to save appointment.");
            return;
          }

          router.refresh();
          onCancel?.();
        });
      }}
      className="space-y-4 rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {appointment?.id ? "Edit Appointment" : "Add Appointment"}
          </h2>
          <p className="text-sm text-slate-600">Upcoming medical reviews, interviews, and other timed tasks.</p>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>
        ) : null}
      </div>

      <input type="hidden" name="id" defaultValue={appointment?.id ?? ""} />
      <input type="hidden" name="affectsMorningStrength" value={String(affectsMorningStrength)} />
      <input type="hidden" name="affectsAfternoonStrength" value={String(affectsAfternoonStrength)} />
      <input type="hidden" name="affectsEveningStrength" value={String(affectsEveningStrength)} />
      <input type="hidden" name="completed" value={String(completed)} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CadetSelectField cadets={cadets} name="cadetId" defaultValue={appointment?.cadetId ?? ""} required />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input
            name="title"
            defaultValue={appointment?.title ?? ""}
            required
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Venue</label>
          <input
            name="venue"
            defaultValue={appointment?.venue ?? ""}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Appointment time</label>
          <input
            name="appointmentAt"
            type="text"
            autoComplete="off"
            placeholder="DDMMYY HHMM"
            defaultValue={appointment?.appointmentAt ? formatCompactDateTimeInputValue(new Date(appointment.appointmentAt)) : ""}
            required
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
          <p className="text-xs text-slate-500">Use DDMMYY HHMM. Example: 300426 0930.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={appointment?.notes ?? ""}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={affectsMorningStrength}
            onChange={(event) => setAffectsMorningStrength(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          Affects morning strength
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={affectsAfternoonStrength}
            onChange={(event) => setAffectsAfternoonStrength(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          Affects afternoon strength
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={affectsEveningStrength}
            onChange={(event) => setAffectsEveningStrength(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          Affects evening strength
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={completed}
          onChange={(event) => setCompleted(event.target.checked)}
          className="size-4 rounded border-black/20"
        />
        Mark as completed
      </label>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : appointment?.id ? "Update Appointment" : "Create Appointment"}
      </button>
    </form>
  );
}
