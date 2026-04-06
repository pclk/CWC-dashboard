"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createWeeklyTodoAction,
  deleteWeeklyTodoAction,
  toggleWeeklyTodoAction,
} from "@/actions/weekly-todos";

type WeeklyTodoItem = {
  id: string;
  title: string;
  systemKey: string | null;
  completed: boolean;
  canToggle: boolean;
  canDelete: boolean;
  helperText?: string;
};

export function WeeklyTodoList({
  items,
}: {
  items: WeeklyTodoItem[];
}) {
  const router = useRouter();
  const [newTitle, setNewTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Weekly Todo</h2>
          <p className="text-sm text-slate-600">Resets every Sunday.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={item.completed}
                disabled={!item.canToggle || pending}
                onChange={(event) => {
                  setError(null);
                  startTransition(async () => {
                    const formData = new FormData();
                    formData.set("id", item.id);
                    formData.set("completed", String(event.target.checked));
                    const result = await toggleWeeklyTodoAction(formData);

                    if (!result.ok) {
                      setError(result.error ?? "Unable to update weekly todo.");
                      return;
                    }

                    router.refresh();
                  });
                }}
                className="mt-1 size-4 rounded border-black/20"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    item.completed ? "text-slate-400 line-through" : "text-slate-900"
                  }`}
                >
                  {item.title}
                </p>
                {item.helperText ? (
                  <p className="mt-1 text-xs text-slate-500">{item.helperText}</p>
                ) : null}
              </div>
              {item.canDelete ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm("Delete this weekly todo?")) {
                      return;
                    }

                    setError(null);
                    startTransition(async () => {
                      const formData = new FormData();
                      formData.set("id", item.id);
                      const result = await deleteWeeklyTodoAction(formData);

                      if (!result.ok) {
                        setError(result.error ?? "Unable to delete weekly todo.");
                        return;
                      }

                      router.refresh();
                    });
                  }}
                  className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await createWeeklyTodoAction(formData);

            if (!result.ok) {
              setError(result.error ?? "Unable to create weekly todo.");
              return;
            }

            setNewTitle("");
            router.refresh();
          });
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <input
          name="title"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Add weekly task"
          className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
        />
        <button
          type="submit"
          disabled={pending || !newTitle.trim()}
          className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
