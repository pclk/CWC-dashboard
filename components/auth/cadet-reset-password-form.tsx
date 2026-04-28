"use client";

import { useActionState } from "react";

import { cadetResetPasswordAction } from "@/actions/cadet-reset";

export function CadetResetPasswordForm({
  token,
  displayName,
}: {
  token: string;
  displayName: string;
}) {
  const [state, formAction, pending] = useActionState(cadetResetPasswordAction, undefined);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm"
    >
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hello, {displayName}</h1>
        <p className="text-sm text-slate-600">
          Set a password for your cadet account. After saving, sign in with your cadet name or
          shorthand and this password.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
        />
        <p className="text-xs text-slate-500">At least 8 characters.</p>
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
          minLength={8}
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
        {pending ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
