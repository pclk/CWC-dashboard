"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteParadeStateSnapshotAction, saveParadeStateSnapshotAction } from "@/actions/parade-state";
import { MessageEditor } from "@/components/generators/message-editor";
import { formatCompactDmyHm, formatDateTimeInputValue, parseSingaporeInputToUtc } from "@/lib/date";
import {
  buildParadeCaaLine,
  generateParadeStateMessage,
  type ParadeStateInput,
} from "@/lib/generators/parade-state";
import { buildTextPreview, renderTemplate } from "@/lib/formatting";

type SnapshotRow = {
  id: string;
  label: string;
  reportedAt: Date | string;
  totalStrength: number;
  presentStrength: number;
  finalMessage: string;
};

export function ParadeStatePreview({
  initialInput,
  morningTemplate,
  nightTemplate,
  defaultMorningPrefix,
  defaultNightPrefix,
  dueConfirmationCount,
  history,
}: {
  initialInput: ParadeStateInput;
  morningTemplate: string;
  nightTemplate: string;
  defaultMorningPrefix: string;
  defaultNightPrefix: string;
  dueConfirmationCount: number;
  history: SnapshotRow[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"generator" | "history">("generator");
  const [reportType, setReportType] = useState<"Morning" | "Night" | "Custom">("Morning");
  const [reportAtValue, setReportAtValue] = useState(formatDateTimeInputValue(new Date()));
  const [reportTimeLabel, setReportTimeLabel] = useState("Morning");
  const [prefixOverride, setPrefixOverride] = useState("");
  const [openSnapshotId, setOpenSnapshotId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function buildInput(): ParadeStateInput {
    const reportAt = parseSingaporeInputToUtc(reportAtValue) ?? new Date();
    const prefixTemplate =
      prefixOverride.trim() ||
      (reportType === "Night" ? defaultNightPrefix : defaultMorningPrefix);

    return {
      ...initialInput,
      prefix: renderTemplate(prefixTemplate, {
        unitName: initialInput.unitName,
        reportAt: formatCompactDmyHm(reportAt),
      }),
      caaLine: buildParadeCaaLine(reportAt, reportTimeLabel),
    };
  }

  function getTemplateBody() {
    return reportType === "Night" ? nightTemplate : morningTemplate;
  }

  const initialGeneratedText = generateParadeStateMessage(buildInput(), getTemplateBody());

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
            <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Report Type</label>
                <select
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value as typeof reportType)}
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
                  type="datetime-local"
                  value={reportAtValue}
                  onChange={(event) => setReportAtValue(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Report Time Label</label>
                <input
                  value={reportTimeLabel}
                  onChange={(event) => setReportTimeLabel(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Prefix Override</label>
                <input
                  value={prefixOverride}
                  onChange={(event) => setPrefixOverride(event.target.value)}
                  placeholder="Optional override"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Present Strength</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{initialInput.presentStrength}</p>
            </div>
            <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Strength</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{initialInput.totalStrength}</p>
            </div>
            <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Due Confirmations</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{dueConfirmationCount}</p>
            </div>
            <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Today’s Appointments</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {initialInput.upcomingAppointments.length}
              </p>
            </div>
          </section>

          <MessageEditor
            initialGeneratedText={initialGeneratedText}
            getRegeneratedText={() => generateParadeStateMessage(buildInput(), getTemplateBody())}
            onSave={async (text) => {
              const reportAt = parseSingaporeInputToUtc(reportAtValue) ?? new Date();

              return saveParadeStateSnapshotAction({
                label: reportType,
                reportedAt: reportAt,
                totalStrength: initialInput.totalStrength,
                presentStrength: initialInput.presentStrength,
                finalMessage: text,
              });
            }}
            saveLabel="Save Snapshot"
          />
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
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm("Delete this snapshot?")) {
                            return;
                          }

                          startTransition(async () => {
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
