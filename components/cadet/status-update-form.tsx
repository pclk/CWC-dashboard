"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { createMcStatusUpdateRequest } from "@/actions/cadet-requests";
import { RECORD_CATEGORY_VALUES, getRecordCategoryLabel } from "@/lib/record-categories";

type FormState = {
  category: (typeof RECORD_CATEGORY_VALUES)[number];
  title: string;
  details: string;
  startAt: string;
  endAt: string;
  unknownEndTime: boolean;
};

const INITIAL_STATE: FormState = {
  category: "MC",
  title: "",
  details: "",
  startAt: "",
  endAt: "",
  unknownEndTime: false,
};

export function CadetStatusUpdateForm() {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createMcStatusUpdateRequest({
        category: values.category,
        title: values.title.trim() || undefined,
        details: values.details.trim() || undefined,
        startAt: values.startAt ? new Date(values.startAt).toISOString() : undefined,
        endAt:
          values.unknownEndTime || !values.endAt
            ? undefined
            : new Date(values.endAt).toISOString(),
        unknownEndTime: values.unknownEndTime,
      });

      if (!result.ok) {
        setError(result.error ?? "Unable to submit request.");
        return;
      }

      setSubmittedAt(new Date());
      setValues(INITIAL_STATE);
    });
  };

  if (submittedAt) {
    return (
      <section className="rounded-[2rem] border border-teal-200 bg-teal-50/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Submitted
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Your status update was submitted
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          The CWC will review and approve this update. It will appear in the records once approved.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubmittedAt(null)}
            className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Submit another update
          </button>
          <Link
            href="/cadet/dashboard"
            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            value={values.category}
            onChange={(event) =>
              update("category", event.target.value as FormState["category"])
            }
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
          >
            {RECORD_CATEGORY_VALUES.map((category) => (
              <option key={category} value={category}>
                {getRecordCategoryLabel(category)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="e.g. MC 2 days"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="details">
          Details
        </label>
        <textarea
          id="details"
          value={values.details}
          onChange={(event) => update("details", event.target.value)}
          rows={3}
          placeholder="Anything the CWC should know — e.g. clinic, condition, follow-up."
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="startAt">
            Start
          </label>
          <input
            id="startAt"
            type="datetime-local"
            value={values.startAt}
            onChange={(event) => update("startAt", event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="endAt">
            End
          </label>
          <input
            id="endAt"
            type="datetime-local"
            value={values.endAt}
            onChange={(event) => update("endAt", event.target.value)}
            disabled={values.unknownEndTime}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={values.unknownEndTime}
          onChange={(event) => update("unknownEndTime", event.target.checked)}
          className="h-4 w-4 accent-teal-700"
        />
        I don&apos;t know the end time yet
      </label>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Submitting..." : "Submit status update"}
      </button>
    </form>
  );
}
