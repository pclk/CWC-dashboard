"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { upsertCadetAction } from "@/actions/cadets";

type CadetFormValues = {
  id?: string;
  rank: string;
  displayName: string;
  serviceNumber?: string | null;
  active: boolean;
  sortOrder: number;
  notes?: string | null;
};

export function CadetForm({
  cadet,
  onCancel,
}: {
  cadet?: CadetFormValues | null;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(cadet?.active ?? true);

  return (
    <form
      action={(formData) => {
        setError(null);

        startTransition(async () => {
          formData.set("active", String(active));
          const result = await upsertCadetAction(formData);

          if (!result.ok) {
            setError(result.error ?? "Unable to save cadet.");
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
            {cadet?.id ? "Edit Cadet" : "Add Cadet"}
          </h2>
          <p className="text-sm text-slate-600">Roster changes are scoped to your account only.</p>
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

      <input type="hidden" name="id" defaultValue={cadet?.id ?? ""} />
      <input type="hidden" name="active" value={String(active)} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Rank</label>
          <input
            name="rank"
            defaultValue={cadet?.rank ?? "ME4T"}
            required
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Display Name</label>
          <input
            name="displayName"
            defaultValue={cadet?.displayName ?? ""}
            required
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Service Number</label>
          <input
            name="serviceNumber"
            defaultValue={cadet?.serviceNumber ?? ""}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Sort Order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={cadet?.sortOrder ?? 0}
            min={0}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={cadet?.notes ?? ""}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
        />
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="size-4 rounded border-black/20"
        />
        Active roster member
      </label>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : cadet?.id ? "Update Cadet" : "Create Cadet"}
      </button>
    </form>
  );
}
