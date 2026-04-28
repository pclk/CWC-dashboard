"use client";

import { useActionState } from "react";

import { createInitialUserAction } from "@/actions/auth";

export function SetupForm() {
  const [state, formAction, pending] = useActionState(createInitialUserAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create initial account</h1>
        <p className="text-sm text-slate-600">
          This route only works before the first user exists. After setup, authentication is closed.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="displayName">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="batchName">
          Batch name
        </label>
        <input
          id="batchName"
          name="batchName"
          type="text"
          autoComplete="username"
          required
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
          />
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
