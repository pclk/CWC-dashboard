"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { upsertRecordAction } from "@/actions/records";
import { CadetSelectField } from "@/components/cadets/cadet-select-field";
import { formatCompactDateInputValue } from "@/lib/date";
import { getRecordCategoryLabel, RECORD_CATEGORY_VALUES } from "@/lib/record-categories";

const categoryDefaults: Record<string, { affectsStrength: boolean; countsNotInCamp: boolean }> = {
  MC: { affectsStrength: true, countsNotInCamp: true },
  RSO: { affectsStrength: true, countsNotInCamp: true },
  RSI: { affectsStrength: false, countsNotInCamp: false },
  CL: { affectsStrength: true, countsNotInCamp: true },
  HL: { affectsStrength: true, countsNotInCamp: true },
  OTHER: { affectsStrength: false, countsNotInCamp: false },
  STATUS_RESTRICTION: { affectsStrength: false, countsNotInCamp: false },
};

type CadetOption = {
  id: string;
  rank: string;
  displayName: string;
  active: boolean;
};

type RecordValues = {
  id: string;
  cadetId: string;
  category: string;
  title: string | null;
  details: string | null;
  startAt: Date | string | null;
  endAt: Date | string | null;
  unknownEndTime: boolean;
  affectsStrength: boolean;
  countsNotInCamp: boolean;
  sortOrder: number;
};

export function RecordForm({
  cadets,
  record,
  onCancel,
}: {
  cadets: CadetOption[];
  record?: RecordValues | null;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(record?.category ?? "MC");
  const [unknownEndTime, setUnknownEndTime] = useState(record?.unknownEndTime ?? false);
  const [affectsStrength, setAffectsStrength] = useState(
    record?.affectsStrength ?? categoryDefaults.MC.affectsStrength,
  );
  const [countsNotInCamp, setCountsNotInCamp] = useState(
    record?.countsNotInCamp ?? categoryDefaults.MC.countsNotInCamp,
  );

  function applyCategoryDefaults(nextCategory: string) {
    setCategory(nextCategory);
    setAffectsStrength(categoryDefaults[nextCategory].affectsStrength);
    setCountsNotInCamp(categoryDefaults[nextCategory].countsNotInCamp);
    if (!["MC", "HL"].includes(nextCategory)) {
      setUnknownEndTime(false);
    }
  }

  const canUseUnknownEndTime = category === "MC" || category === "HL";
  const requiresTiming = category !== "RSI";

  return (
    <form
      action={(formData) => {
        setError(null);

        startTransition(async () => {
          formData.set("category", category);
          formData.set("unknownEndTime", String(canUseUnknownEndTime && unknownEndTime));
          if (!requiresTiming) {
            formData.set("startAt", "");
            formData.set("endAt", "");
            formData.set("unknownEndTime", "false");
          }
          if (canUseUnknownEndTime && unknownEndTime) {
            formData.set("endAt", "");
          }
          formData.set("affectsStrength", String(affectsStrength));
          formData.set("countsNotInCamp", String(countsNotInCamp));
          const result = await upsertRecordAction(formData);

          if (!result.ok) {
            setError(result.error ?? "Unable to save record.");
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
            {record?.id ? "Edit Record" : "Add Record"}
          </h2>
          <p className="text-sm text-slate-600">
            Expired records move to manual confirmation instead of disappearing.
          </p>
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

      <input type="hidden" name="id" defaultValue={record?.id ?? ""} />
      <input type="hidden" name="unknownEndTime" value={String(canUseUnknownEndTime && unknownEndTime)} />
      <input type="hidden" name="affectsStrength" value={String(affectsStrength)} />
      <input type="hidden" name="countsNotInCamp" value={String(countsNotInCamp)} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CadetSelectField cadets={cadets} name="cadetId" defaultValue={record?.cadetId ?? ""} required />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <select
            name="category"
            value={category}
            onChange={(event) => applyCategoryDefaults(event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          >
            {RECORD_CATEGORY_VALUES.map((option) => (
              <option key={option} value={option}>
                {getRecordCategoryLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Title</label>
          <input
            name="title"
            defaultValue={record?.title ?? ""}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            placeholder="Medical Review, Flu, Heavy Load"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Sort Order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={record?.sortOrder ?? 0}
            min={0}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Details</label>
        <textarea
          name="details"
          rows={3}
          defaultValue={record?.details ?? ""}
          placeholder="Freeform line shown in generated messages when needed."
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
        />
      </div>

      {requiresTiming ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Start</label>
            <input
              name="startAt"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="DDMMYY"
              defaultValue={record?.startAt ? formatCompactDateInputValue(new Date(record.startAt)) : ""}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
            <p className="text-xs text-slate-500">Use DDMMYY. Example: 010426.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">End</label>
            <input
              name="endAt"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="DDMMYY"
              defaultValue={record?.endAt ? formatCompactDateInputValue(new Date(record.endAt)) : ""}
              disabled={canUseUnknownEndTime && unknownEndTime}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
            <p className="text-xs text-slate-500">
              {canUseUnknownEndTime && unknownEndTime
                ? "Unknown end time records stay active until you update them manually."
                : "Records flag at 0000 on the day after the end date."}
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          RSI records do not need timing.
        </p>
      )}

      {requiresTiming && canUseUnknownEndTime ? (
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={unknownEndTime}
            onChange={(event) => setUnknownEndTime(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          Unknown End Time
        </label>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={affectsStrength}
            onChange={(event) => setAffectsStrength(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          Affects strength
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={countsNotInCamp}
            onChange={(event) => setCountsNotInCamp(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          Counts as not in camp
        </label>
      </div>

      {category === "STATUS_RESTRICTION" ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Status records should usually carry start and end dates so the confirmation workflow
          can surface them safely.
        </p>
      ) : null}

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : record?.id ? "Update Record" : "Create Record"}
      </button>
    </form>
  );
}
