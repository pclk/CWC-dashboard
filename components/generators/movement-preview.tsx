"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteTroopMovementAction, saveTroopMovementAction } from "@/actions/troop-movement";
import { MessageEditor } from "@/components/generators/message-editor";
import { formatCompactDmyHm } from "@/lib/date";
import { generateTroopMovementMessage } from "@/lib/generators/troop-movement";
import { buildTextPreview } from "@/lib/formatting";

type MovementHistory = {
  id: string;
  fromLocation: string;
  toLocation: string;
  strengthText: string;
  arrivalTimeText: string;
  remarks: string;
  finalMessage: string;
  createdAt: Date | string;
};

export function MovementPreview({
  unitName,
  templateBody,
  suggestedStrengthText,
  remarkSuggestions,
  history,
}: {
  unitName: string;
  templateBody: string;
  suggestedStrengthText: string;
  remarkSuggestions: string[];
  history: MovementHistory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [strengthText, setStrengthText] = useState(suggestedStrengthText);
  const [arrivalTimeText, setArrivalTimeText] = useState("");
  const [remarks, setRemarks] = useState(remarkSuggestions.length ? remarkSuggestions : [""]);

  function normalizedRemarks() {
    return remarks.map((remark) => remark.trim()).filter(Boolean);
  }

  const initialGeneratedText = generateTroopMovementMessage(
    {
      unitName,
      fromLocation,
      toLocation,
      strengthText,
      arrivalTimeText,
      remarks: normalizedRemarks(),
    },
    templateBody,
  );

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Troop Movement</h1>
        <p className="mt-2 text-sm text-slate-600">
          Keep the form situational. Suggestions are derived from current records, but the remarks
          remain fully editable.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">From</label>
            <input
              value={fromLocation}
              onChange={(event) => setFromLocation(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">To</label>
            <input
              value={toLocation}
              onChange={(event) => setToLocation(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Strength Text</label>
            <input
              value={strengthText}
              onChange={(event) => setStrengthText(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Arrival Time Text</label>
            <input
              value={arrivalTimeText}
              onChange={(event) => setArrivalTimeText(event.target.value)}
              placeholder="0900"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Remarks</h2>
            <button
              type="button"
              onClick={() => setRemarks((current) => [...current, ""])}
              className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Add line
            </button>
          </div>

          {remarkSuggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {remarkSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    setRemarks((current) =>
                      current.includes(suggestion) ? current : [...current, suggestion],
                    )
                  }
                  className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            {remarks.map((remark, index) => (
              <div key={`${index}-${remark}`} className="flex gap-2">
                <input
                  value={remark}
                  onChange={(event) =>
                    setRemarks((current) =>
                      current.map((value, valueIndex) =>
                        valueIndex === index ? event.target.value : value,
                      ),
                    )
                  }
                  className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                />
                <button
                  type="button"
                  onClick={() =>
                    setRemarks((current) =>
                      current.length === 1 ? [""] : current.filter((_, valueIndex) => valueIndex !== index),
                    )
                  }
                  className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MessageEditor
        initialGeneratedText={initialGeneratedText}
        getRegeneratedText={() =>
          generateTroopMovementMessage(
            {
              unitName,
              fromLocation,
              toLocation,
              strengthText,
              arrivalTimeText,
              remarks: normalizedRemarks(),
            },
            templateBody,
          )
        }
        onSave={(text) =>
          saveTroopMovementAction({
            fromLocation,
            toLocation,
            strengthText,
            arrivalTimeText,
            remarks: normalizedRemarks(),
            finalMessage: text,
          })
        }
        saveLabel="Save Movement"
      />

      <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Movement History</h2>
        <div className="mt-4 space-y-4">
          {history.length ? (
            history.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-black/10 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.fromLocation} → {item.toLocation}
                    </p>
                    <p className="text-sm text-slate-600">
                      {item.strengthText} • {item.arrivalTimeText} •{" "}
                      {formatCompactDmyHm(new Date(item.createdAt))}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{buildTextPreview(item.finalMessage)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.finalMessage);
                      }}
                      className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("Delete this troop movement history item?")) {
                          return;
                        }

                        startTransition(async () => {
                          const result = await deleteTroopMovementAction({ id: item.id });

                          if (result.ok) {
                            router.refresh();
                          }
                        });
                      }}
                      className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-black/10 px-4 py-8 text-sm text-slate-500">
              No troop movement history yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
