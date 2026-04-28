"use client";

import Link from "next/link";
import { useActionState } from "react";

import { cadetLoginAction } from "@/actions/cadet-auth";

export function CadetLoginForm() {
  const [state, formAction, pending] = useActionState(cadetLoginAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Cadet sign in</h1>
        <p className="text-sm text-slate-600">
          Use your cadet name or shorthand and password to access trainee services.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="cadetIdentifier">
          Cadet name or shorthand
        </label>
        <input
          id="cadetIdentifier"
          name="cadetIdentifier"
          type="text"
          autoComplete="username"
          required
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
        />
      </div>

      {state?.error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <div className="border-t border-black/10 pt-4">
        <Link
          href="/cwc/instructors"
          className="flex w-full items-center justify-center rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Sign in as Instructor
        </Link>
      </div>
    </form>
  );
}
