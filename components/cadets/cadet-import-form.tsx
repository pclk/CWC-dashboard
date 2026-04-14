"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { importCadetsCsvAction } from "@/actions/cadets";

export function CadetImportForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Import CSV
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        setMessage(null);

        startTransition(async () => {
          const result = await importCadetsCsvAction(formData);

          if (!result.ok) {
            setError(result.error ?? "Unable to import cadets.");
            return;
          }

          formRef.current?.reset();
          setMessage(result.message ?? "Cadets imported.");
          router.refresh();
        });
      }}
      className="basis-full space-y-4 rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Import Cadets</h2>
          <p className="text-sm text-slate-600">
            Upload a CSV to create or update cadets by display name.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setMessage(null);
          }}
          className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="cadetCsvFile">
          CSV file
        </label>
        <input
          id="cadetCsvFile"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
        />
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>Supported headers: rank, displayName, shorthand, active, sortOrder, notes.</p>
        <p>Also accepted: name, display name, nickname, short name, status, order, remarks.</p>
        <p>Blank rank, active, and sortOrder cells default to ME4T, true, and 0.</p>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Importing..." : "Import Cadets"}
      </button>
    </form>
  );
}
