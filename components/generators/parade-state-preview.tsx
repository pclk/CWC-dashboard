"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateParadeDraftAction } from "@/actions/generator-drafts";
import {
  deleteParadeStateSnapshotAction,
  previewParadeStateAction,
  saveParadeStateSnapshotAction,
} from "@/actions/parade-state";
import { MessageEditor } from "@/components/generators/message-editor";
import {
  formatCompactDateTimeInputValue,
  formatCompactDmyHm,
  parseSingaporeInputToUtc,
} from "@/lib/date";
import {
  generateParadeStateMessage,
  getDefaultParadeReportAtValue,
  type ParadeStateInput,
} from "@/lib/generators/parade-state";
import { buildTextPreview } from "@/lib/formatting";

type SnapshotRow = {
  id: string;
  label: string;
  reportedAt: Date | string;
  totalStrength: number;
  presentStrength: number;
  finalMessage: string;
};

type PreviewState = {
  generatedText: string;
  totalStrength: number;
  presentStrength: number;
};

export function ParadeStatePreview({
  initialInput,
  templateBody,
  initialReportType,
  initialReportAtValue,
  dueConfirmationCount,
  history,
}: {
  initialInput: ParadeStateInput;
  templateBody: string;
  initialReportType: "Morning" | "Night" | "Custom";
  initialReportAtValue?: string | null;
  dueConfirmationCount: number;
  history: SnapshotRow[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"generator" | "history">("generator");
  const [draftPending, startDraftTransition] = useTransition();
  const [previewPending, startPreviewTransition] = useTransition();
  const resolvedInitialReportAtValue = resolveInitialReportAtValue(
    initialReportType,
    initialReportAtValue,
  );
  const [reportType, setReportType] = useState<"Morning" | "Night" | "Custom">(initialReportType);
  const [reportAtValue, setReportAtValue] = useState(resolvedInitialReportAtValue);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [openSnapshotId, setOpenSnapshotId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>(() => ({
    generatedText: generateParadeStateMessage(initialInput, templateBody),
    totalStrength: initialInput.totalStrength,
    presentStrength: initialInput.presentStrength,
  }));
  const lastSavedDraftRef = useRef(
    JSON.stringify({
      reportType: initialReportType,
      reportAtValue: resolvedInitialReportAtValue,
    }),
  );
  const lastPreviewRequestRef = useRef(
    JSON.stringify({
      reportType: initialReportType,
      reportAtValue: resolvedInitialReportAtValue,
    }),
  );

  function handleReportTypeChange(nextReportType: "Morning" | "Night" | "Custom") {
    const previousDefaultValue = getDefaultParadeReportAtValue(reportType);

    setReportType(nextReportType);

    if (!reportAtValue.trim() || reportAtValue === previousDefaultValue) {
      setReportAtValue(getDefaultParadeReportAtValue(nextReportType));
    }
  }

  useEffect(() => {
    const nextDraft = JSON.stringify({
      reportType,
      reportAtValue,
    });

    if (nextDraft === lastSavedDraftRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startDraftTransition(async () => {
        const result = await updateParadeDraftAction({
          reportType,
          reportAtValue,
        });

        if (result.ok) {
          lastSavedDraftRef.current = nextDraft;
        }
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [reportAtValue, reportType, startDraftTransition]);

  useEffect(() => {
    const nextRequest = JSON.stringify({
      reportType,
      reportAtValue,
    });

    if (nextRequest === lastPreviewRequestRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startPreviewTransition(async () => {
        const result = await previewParadeStateAction({
          reportType,
          reportAtValue,
        });

        if (!result.ok) {
          setPreviewError(result.error);
          return;
        }

        lastPreviewRequestRef.current = nextRequest;
        setPreviewError(null);
        setPreviewState({
          generatedText: result.generatedText,
          totalStrength: result.totalStrength,
          presentStrength: result.presentStrength,
        });
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [reportAtValue, reportType, startPreviewTransition]);

  async function regeneratePreview() {
    const nextRequest = JSON.stringify({
      reportType,
      reportAtValue,
    });
    const result = await previewParadeStateAction({
      reportType,
      reportAtValue,
    });

    if (!result.ok) {
      setPreviewError(result.error);
      return previewState.generatedText;
    }

    setPreviewError(null);
    lastPreviewRequestRef.current = nextRequest;
    setPreviewState({
      generatedText: result.generatedText,
      totalStrength: result.totalStrength,
      presentStrength: result.presentStrength,
    });

    return result.generatedText;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Parade State</h1>
            <p className="text-sm text-slate-600">
              Generate deterministic parade state messages from server-scoped operational records.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("generator")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                view === "generator"
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Generator
            </button>
            <button
              type="button"
              onClick={() => setView("history")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                view === "history"
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100"
              }`}
            >
              History
            </button>
          </div>
        </div>
      </section>

      {view === "generator" ? (
        <>
          <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Configuration</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Report Type</label>
                <select
                  value={reportType}
                  onChange={(event) =>
                    handleReportTypeChange(event.target.value as typeof reportType)
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                >
                  <option value="Morning">Morning</option>
                  <option value="Night">Night</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Report Date</label>
                <input
                  type="text"
                  value={reportAtValue}
                  onChange={(event) => setReportAtValue(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="DDMMYY HHMM"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                />
                <p className="text-xs text-slate-500">Use DDMMYY HHMM. Example: 300326 0900.</p>
              </div>
            </div>

            {previewError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {previewError}
              </p>
            ) : null}
          </section>

          <section className="grid gap-4">
            <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Due Confirmations</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{dueConfirmationCount}</p>
            </div>
          </section>

          <MessageEditor
            initialGeneratedText={previewState.generatedText}
            getRegeneratedText={regeneratePreview}
            onSave={async (text) => {
              let reportAt: Date;

              try {
                reportAt = parseSingaporeInputToUtc(reportAtValue) ?? new Date();
              } catch (error) {
                return {
                  ok: false,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Invalid parade report date and time.",
                };
              }

              return saveParadeStateSnapshotAction({
                label: reportType,
                reportedAt: reportAt,
                totalStrength: previewState.totalStrength,
                presentStrength: previewState.presentStrength,
                finalMessage: text,
              });
            }}
            saveLabel="Save Snapshot"
          />

          {draftPending ? <p className="text-xs text-slate-500">Saving draft...</p> : null}
          {previewPending ? <p className="text-xs text-slate-500">Refreshing preview...</p> : null}
        </>
      ) : (
        <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Snapshot History</h2>
          <div className="mt-4 space-y-4">
            {history.length ? (
              history.map((snapshot) => (
                <article key={snapshot.id} className="rounded-[1.5rem] border border-black/10 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {snapshot.label} • {formatCompactDmyHm(new Date(snapshot.reportedAt))}
                      </p>
                      <p className="text-sm text-slate-600">
                        Strength {snapshot.presentStrength}/{snapshot.totalStrength}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{buildTextPreview(snapshot.finalMessage)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSnapshotId((current) => (current === snapshot.id ? null : snapshot.id))
                        }
                        className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(snapshot.finalMessage);
                        }}
                        className="rounded-2xl border border-black/10 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        disabled={draftPending || previewPending}
                        onClick={() => {
                          if (!window.confirm("Delete this snapshot?")) {
                            return;
                          }

                          startDraftTransition(async () => {
                            const result = await deleteParadeStateSnapshotAction({ id: snapshot.id });

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

                  {openSnapshotId === snapshot.id ? (
                    <pre className="mt-4 overflow-x-auto rounded-[1.25rem] bg-slate-50 p-4 text-sm whitespace-pre-wrap text-slate-700">
                      {snapshot.finalMessage}
                    </pre>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-black/10 px-4 py-8 text-sm text-slate-500">
                No parade state snapshots saved yet.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function resolveInitialReportAtValue(
  reportType: "Morning" | "Night" | "Custom",
  initialValue?: string | null,
) {
  if (!initialValue?.trim()) {
    return getDefaultParadeReportAtValue(reportType);
  }

  try {
    return formatCompactDateTimeInputValue(parseSingaporeInputToUtc(initialValue) ?? new Date());
  } catch {
    return getDefaultParadeReportAtValue(reportType);
  }
}
