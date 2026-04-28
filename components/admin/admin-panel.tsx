"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  adminLoginAction,
  adminLogoutAction,
  changeInstructorPasswordAsAdminAction,
  type AdminPanelState,
} from "@/actions/admin";

export function AdminPanel({ initialState }: { initialState: AdminPanelState }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(initialState.isAuthenticated);
  const [batchName, setBatchName] = useState(initialState.batchName);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordValues, setPasswordValues] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10 sm:px-6">
        <form
          action={() => {
            startTransition(async () => {
              const result = await adminLoginAction({ adminPassword });

              if (result.ok) {
                setIsAuthenticated(true);
                setBatchName(result.batchName ?? null);
                setAdminPassword("");
                setStatus(null);
                return;
              }

              setStatus(result.error ?? "Unable to sign in.");
            });
          }}
          className="space-y-4 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Admin Panel
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Admin sign in
            </h1>
            <p className="text-sm text-slate-600">
              Use the admin password to manage the instructor password.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="adminPassword">
              Admin password
            </label>
            <input
              id="adminPassword"
              type="password"
              autoComplete="current-password"
              required
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
            />
          </div>

          {status ? <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>

          <Link
            href="/instructors"
            className="flex w-full justify-center rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Instructor login
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-10 sm:px-6">
      <section className="space-y-5 rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Admin Panel
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Change instructor password
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {batchName
                ? `Instructor login batch: ${batchName}`
                : "No instructor account is set up yet."}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await adminLogoutAction();
                setIsAuthenticated(false);
                setStatus(null);
                setPasswordValues({ newPassword: "", confirmPassword: "" });
              });
            }}
            className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="newInstructorPassword">
              New instructor password
            </label>
            <input
              id="newInstructorPassword"
              type="password"
              autoComplete="new-password"
              value={passwordValues.newPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="confirmInstructorPassword">
              Confirm instructor password
            </label>
            <input
              id="confirmInstructorPassword"
              type="password"
              autoComplete="new-password"
              value={passwordValues.confirmPassword}
              onChange={(event) =>
                setPasswordValues((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-teal-700"
            />
          </div>
        </div>

        {status ? <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={pending || !batchName}
            onClick={() => {
              startTransition(async () => {
                const result = await changeInstructorPasswordAsAdminAction(passwordValues);

                if (result.ok) {
                  setPasswordValues({ newPassword: "", confirmPassword: "" });
                }

                setStatus(
                  result.ok
                    ? result.message ?? "Instructor password updated."
                    : result.error ?? "Unable to update instructor password.",
                );
              });
            }}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Change instructor password
          </button>
          <Link
            href="/instructors"
            className="rounded-2xl border border-black/10 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Instructor login
          </Link>
        </div>
      </section>
    </main>
  );
}
