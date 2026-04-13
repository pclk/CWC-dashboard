"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateTroopMovementDraftAction } from "@/actions/generator-drafts";
import { deleteTroopMovementAction, saveTroopMovementAction } from "@/actions/troop-movement";
import { MessageEditor } from "@/components/generators/message-editor";
import { SearchableCombobox } from "@/components/generators/searchable-combobox";
import { formatCompactDmyHm } from "@/lib/date";
import { buildTextPreview } from "@/lib/formatting";
import {
  DEFAULT_TROOP_MOVEMENT_LOCATION_SUGGESTIONS,
  generateTroopMovementMessage,
} from "@/lib/generators/troop-movement";
import {
  TROOP_MOVEMENT_STRENGTH_MODES,
  autoCorrectTroopMovementRemarkRow,
  buildTroopMovementStrengthText,
  createEmptyTroopMovementRemarkRow,
  formatTroopMovementRemarkRows,
  parseTroopMovementDraftText,
  parseTroopMovementRemarkLines,
  resolveTroopMovementRemarkRowCount,
  serializeTroopMovementDraft,
  type TroopMovementCadetOption,
  type TroopMovementDraftState,
  type TroopMovementRemarkRow,
  type TroopMovementStrengthMode,
} from "@/lib/troop-movement-remarks";

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
  totalStrength,
  remarkSuggestions,
  activeCadets,
  initialFromLocation,
  initialToLocation,
  initialStrengthText,
  initialArrivalTimeText,
  initialRemarksText,
  nightStudyRemarkSuggestions,
  nightStudyErrors,
  history,
}: {
  unitName: string;
  templateBody: string;
  suggestedStrengthText: string;
  totalStrength: number;
  remarkSuggestions: string[];
  activeCadets: TroopMovementCadetOption[];
  initialFromLocation?: string | null;
  initialToLocation?: string | null;
  initialStrengthText?: string | null;
  initialArrivalTimeText?: string | null;
  initialRemarksText?: string | null;
  nightStudyRemarkSuggestions: string[];
  nightStudyErrors: string[];
  history: MovementHistory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialRemarkDraft = resolveInitialRemarkDraft(initialRemarksText, remarkSuggestions);
  const [fromLocation, setFromLocation] = useState(initialFromLocation ?? "");
  const [toLocation, setToLocation] = useState(initialToLocation ?? "");
  const [strengthText, setStrengthText] = useState(initialStrengthText ?? suggestedStrengthText);
  const [strengthMode, setStrengthMode] = useState<TroopMovementStrengthMode>(
    initialRemarkDraft.strengthMode,
  );
  const [arrivalTimeText, setArrivalTimeText] = useState(initialArrivalTimeText ?? "");
  const [remarkRows, setRemarkRows] = useState<TroopMovementRemarkRow[]>(
    initialRemarkDraft.rows.length ? initialRemarkDraft.rows : [createEmptyTroopMovementRemarkRow()],
  );
  const lastSavedDraftRef = useRef(
    JSON.stringify({
      fromLocation: initialFromLocation ?? "",
      toLocation: initialToLocation ?? "",
      strengthText: initialStrengthText ?? suggestedStrengthText,
      arrivalTimeText: initialArrivalTimeText ?? "",
      remarksText: serializeTroopMovementDraft({
        strengthMode: initialRemarkDraft.strengthMode,
        rows: initialRemarkDraft.rows.length
          ? initialRemarkDraft.rows
          : [createEmptyTroopMovementRemarkRow()],
      }),
    }),
  );

  const locationSuggestions = [
    ...DEFAULT_TROOP_MOVEMENT_LOCATION_SUGGESTIONS,
    ...history.flatMap((item) => [item.fromLocation, item.toLocation]),
  ];
  const resolvedRemarkRows = remarkRows.map((row) =>
    autoCorrectTroopMovementRemarkRow(row, activeCadets),
  );
  const effectiveStrengthText = buildTroopMovementStrengthText({
    manualStrengthText: strengthText,
    totalStrength,
    strengthMode,
    rows: resolvedRemarkRows,
  });

  function normalizedRemarks() {
    return formatTroopMovementRemarkRows(resolvedRemarkRows);
  }

  function mergeRemarkSuggestions(nextSuggestions: string[]) {
    setRemarkRows((current) => {
      const currentRows = current.filter((row) => hasRemarkRowContent(row));
      const currentKeys = new Set(
        formatTroopMovementRemarkRows(
          currentRows.map((row) => autoCorrectTroopMovementRemarkRow(row, activeCadets)),
        ).map((line) => line.toLowerCase()),
      );
      const nextRows = parseTroopMovementRemarkLines(nextSuggestions).filter((row) => {
        const [line] = formatTroopMovementRemarkRows([
          autoCorrectTroopMovementRemarkRow(row, activeCadets),
        ]);

        if (!line || currentKeys.has(line.toLowerCase())) {
          return false;
        }

        currentKeys.add(line.toLowerCase());
        return true;
      });
      const mergedRows = [...currentRows, ...nextRows];

      return mergedRows.length ? mergedRows : [createEmptyTroopMovementRemarkRow()];
    });
  }

  function updateRemarkRow(
    rowIndex: number,
    field: keyof TroopMovementRemarkRow,
    value: string,
  ) {
    setRemarkRows((current) =>
      current.map((row, currentIndex) =>
        currentIndex === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  }

  function autoCorrectRemarkRow(rowIndex: number) {
    setRemarkRows((current) =>
      current.map((row, currentIndex) =>
        currentIndex === rowIndex ? autoCorrectTroopMovementRemarkRow(row, activeCadets) : row,
      ),
    );
  }

  useEffect(() => {
    const remarksText = serializeTroopMovementDraft({
      strengthMode,
      rows: remarkRows,
    });
    const nextDraft = JSON.stringify({
      fromLocation,
      toLocation,
      strengthText,
      arrivalTimeText,
      remarksText,
    });

    if (nextDraft === lastSavedDraftRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const result = await updateTroopMovementDraftAction({
          fromLocation,
          toLocation,
          strengthText,
          arrivalTimeText,
          remarksText,
        });

        if (result.ok) {
          lastSavedDraftRef.current = nextDraft;
        }
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    arrivalTimeText,
    fromLocation,
    remarkRows,
    startTransition,
    strengthMode,
    strengthText,
    toLocation,
  ]);

  const initialGeneratedText = generateTroopMovementMessage(
    {
      unitName,
      fromLocation,
      toLocation,
      strengthText: effectiveStrengthText,
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
          Keep the form situational. Suggestions are derived from current records, and the remarks
          now use a structured table. Enter one name per line in each row, and names auto-correct
          to the closest active cadet when you leave the field.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SearchableCombobox
            label="From"
            value={fromLocation}
            onValueChange={setFromLocation}
            suggestions={locationSuggestions}
            placeholder="Search or type location"
          />
          <SearchableCombobox
            label="To"
            value={toLocation}
            onValueChange={setToLocation}
            suggestions={locationSuggestions}
            placeholder="Search or type location"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Strength Text</label>
            <input
              value={effectiveStrengthText}
              onChange={(event) => setStrengthText(event.target.value)}
              readOnly={strengthMode !== "MANUAL"}
              className={`w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-teal-700 ${
                strengthMode === "MANUAL" ? "bg-white" : "bg-slate-50 text-slate-700"
              }`}
            />
            <label className="block pt-1 text-sm font-medium text-slate-700">
              Strength Calculation
            </label>
            <select
              value={strengthMode}
              onChange={(event) => setStrengthMode(event.target.value as TroopMovementStrengthMode)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            >
              {TROOP_MOVEMENT_STRENGTH_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {formatStrengthModeLabel(mode)}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              {strengthMode === "MANUAL"
                ? "Enter the strength manually."
                : strengthMode === "SUBTRACT"
                  ? `Subtract the summed remark counts from ${totalStrength}.`
                  : `Set the strength to the summed remark counts out of ${totalStrength}.`}
            </p>
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
              Remarks
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!remarkSuggestions.length}
                onClick={() => mergeRemarkSuggestions(remarkSuggestions)}
                className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Load from Parade State
              </button>
              <button
                type="button"
                disabled={!nightStudyRemarkSuggestions.length || nightStudyErrors.length > 0}
                onClick={() => mergeRemarkSuggestions(nightStudyRemarkSuggestions)}
                className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Load Night Study
              </button>
              <button
                type="button"
                onClick={() =>
                  setRemarkRows((current) => [...current, createEmptyTroopMovementRemarkRow()])
                }
                className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Add row
              </button>
            </div>
          </div>

          {nightStudyErrors.length ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Fix Night Study setup before loading: {nightStudyErrors.join(" ")}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-[1.5rem] border border-black/10">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Name List</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {remarkRows.map((row, index) => (
                  <tr key={index} className="border-t border-black/10 align-top">
                    <td className="px-4 py-3">
                      <input
                        value={resolveTroopMovementRemarkRowCount(resolvedRemarkRows[index] ?? row)}
                        readOnly
                        className="w-20 rounded-2xl border border-black/10 bg-slate-50 px-3 py-2 text-center text-slate-700 outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={row.group}
                        onChange={(event) => updateRemarkRow(index, "group", event.target.value)}
                        placeholder="MC"
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={row.namesText}
                        onChange={(event) =>
                          updateRemarkRow(index, "namesText", event.target.value)
                        }
                        onBlur={() => autoCorrectRemarkRow(index)}
                        rows={2}
                        placeholder={"One name per line\nTan, Ah Kow\nJohn Doe"}
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setRemarkRows((current) =>
                            current.length === 1
                              ? [createEmptyTroopMovementRemarkRow()]
                              : current.filter((_, currentIndex) => currentIndex !== index),
                          )
                        }
                        className="rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              strengthText: effectiveStrengthText,
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
            strengthText: effectiveStrengthText,
            arrivalTimeText,
            remarks: normalizedRemarks(),
            finalMessage: text,
          })
        }
        saveLabel="Save Movement"
      />

      {pending ? <p className="text-xs text-slate-500">Saving draft...</p> : null}

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
                    <p className="mt-2 text-sm text-slate-500">
                      {buildTextPreview(item.finalMessage)}
                    </p>
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

function formatStrengthModeLabel(mode: TroopMovementStrengthMode) {
  if (mode === "SUBTRACT") {
    return "Subtract remarks from total";
  }

  if (mode === "SET") {
    return "Set remarks as strength";
  }

  return "Manual";
}

function hasRemarkRowContent(row: TroopMovementRemarkRow) {
  return Boolean(row.countText.trim() || row.group.trim() || row.namesText.trim());
}

function resolveInitialRemarkDraft(
  initialRemarksText: string | null | undefined,
  remarkSuggestions: string[],
): TroopMovementDraftState {
  if (initialRemarksText?.trim()) {
    return parseTroopMovementDraftText(initialRemarksText);
  }

  return {
    strengthMode: "MANUAL",
    rows: parseTroopMovementRemarkLines(remarkSuggestions),
  };
}
