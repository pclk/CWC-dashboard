"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteCadetAction } from "@/actions/cadets";
import { CadetForm } from "@/components/cadets/cadet-form";
import { CadetImportForm } from "@/components/cadets/cadet-import-form";

type CadetRow = {
  id: string;
  rank: string;
  displayName: string;
  serviceNumber: string | null;
  active: boolean;
  sortOrder: number;
  notes: string | null;
};

export function CadetTable({ cadets }: { cadets: CadetRow[] }) {
  const router = useRouter();
  const [editingCadet, setEditingCadet] = useState<CadetRow | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Cadets</h1>
            <p className="text-sm text-slate-600">
              Maintain the active roster, sort order, and baseline identity data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditingCadet({ id: "", rank: "ME4T", displayName: "", serviceNumber: "", active: true, sortOrder: 0, notes: "" })}
              className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              New Cadet
            </button>
            <CadetImportForm />
          </div>
        </div>
      </section>

      {editingCadet ? (
        <CadetForm
          key={editingCadet.id || "new-cadet"}
          cadet={editingCadet.id ? editingCadet : null}
          onCancel={() => setEditingCadet(null)}
        />
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Svc No.</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {cadets.map((cadet) => (
                <tr key={cadet.id} className={!cadet.active ? "bg-slate-50/60 text-slate-500" : ""}>
                  <td className="px-4 py-3">{cadet.rank}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{cadet.displayName}</td>
                  <td className="px-4 py-3">{cadet.serviceNumber || "-"}</td>
                  <td className="px-4 py-3">{cadet.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        cadet.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {cadet.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{cadet.notes || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCadet(cadet)}
                        className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <form
                        action={(formData) => {
                          if (!window.confirm("Delete this cadet and any linked records?")) {
                            return;
                          }

                          startTransition(async () => {
                            const result = await deleteCadetAction(formData);

                            if (result.ok) {
                              router.refresh();
                              if (editingCadet?.id === cadet.id) {
                                setEditingCadet(null);
                              }
                            }
                          });
                        }}
                      >
                        <input type="hidden" name="id" value={cadet.id} />
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
