"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { resolveRecordAction } from "@/actions/records";

export function ConfirmResolveDialog({
  recordId,
  onExtend,
}: {
  recordId: string;
  onExtend: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={(formData) => {
          if (!window.confirm("Confirm this record is resolved?")) {
            return;
          }

          startTransition(async () => {
            const result = await resolveRecordAction(formData);

            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <input type="hidden" name="id" value={recordId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
        >
          Confirm resolved
        </button>
      </form>

      <button
        type="button"
        onClick={onExtend}
        className="rounded-2xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
      >
        Extend
      </button>
    </div>
  );
}
