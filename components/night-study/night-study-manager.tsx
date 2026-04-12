"use client";

import { useState, useTransition, type DragEvent } from "react";

import { updateNightStudyDraftAction } from "@/actions/night-study";
import {
  formatNightStudyNamesText,
  resolveNightStudyAssignments,
  type NightStudyMode,
} from "@/lib/night-study";

type ActiveCadetOption = {
  rank?: string | null;
  displayName: string;
};

type AssignmentColumnKey = "primary" | "early" | "computed";

function formatPillGroupPlaceholder(column: AssignmentColumnKey) {
  if (column === "early") {
    return "Drop personnel here for Early party.";
  }

  if (column === "computed") {
    return "Drop personnel here to move them back into the computed group.";
  }

  return "Drop personnel here.";
}

export function NightStudyManager({
  activeCadets,
  initialMode,
  initialPrimaryNamesText,
  initialEarlyPartyNamesText,
}: {
  activeCadets: ActiveCadetOption[];
  initialMode: NightStudyMode;
  initialPrimaryNamesText: string;
  initialEarlyPartyNamesText: string;
}) {
  const [mode, setMode] = useState<NightStudyMode>(initialMode);
  const [primaryNamesText, setPrimaryNamesText] = useState(initialPrimaryNamesText);
  const [earlyPartyNamesText, setEarlyPartyNamesText] = useState(initialEarlyPartyNamesText);
  const [status, setStatus] = useState<string | null>(null);
  const [draggedName, setDraggedName] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<AssignmentColumnKey | null>(null);
  const [pending, startTransition] = useTransition();
  const resolved = resolveNightStudyAssignments({
    mode,
    primaryNamesText,
    earlyPartyNamesText,
    activeCadets,
  });
  const computedNames =
    resolved.computedLabel === "Night study" ? resolved.nightStudyNames : resolved.goBackBunkNames;

  function persistResolvedAssignments(nextPrimaryNames: string[], nextEarlyPartyNames: string[]) {
    setPrimaryNamesText(formatNightStudyNamesText(nextPrimaryNames));
    setEarlyPartyNamesText(formatNightStudyNamesText(nextEarlyPartyNames));
  }

  function moveNameToColumn(name: string, column: AssignmentColumnKey) {
    const nextPrimaryNames = resolved.primaryNames.filter((currentName) => currentName !== name);
    const nextEarlyPartyNames = resolved.earlyPartyNames.filter((currentName) => currentName !== name);

    if (column === "primary") {
      nextPrimaryNames.push(name);
    }

    if (column === "early") {
      nextEarlyPartyNames.push(name);
    }

    persistResolvedAssignments(nextPrimaryNames, nextEarlyPartyNames);
    setDraggedName(null);
    setDragTarget(null);
  }

  function handleDragStart(event: DragEvent<HTMLButtonElement>, name: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", name);
    setDraggedName(name);
  }

  function handleDragEnd() {
    setDraggedName(null);
    setDragTarget(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, column: AssignmentColumnKey) {
    event.preventDefault();
    const droppedName = draggedName ?? event.dataTransfer.getData("text/plain");

    if (!droppedName) {
      setDragTarget(null);
      return;
    }

    moveNameToColumn(droppedName, column);
  }

  function renderDraggablePills(names: string[]) {
    if (!names.length) {
      return null;
    }

    return names.map((name) => (
      <button
        key={name}
        type="button"
        draggable
        onDragStart={(event) => handleDragStart(event, name)}
        onDragEnd={handleDragEnd}
        className={`rounded-full border px-3 py-1 text-sm transition ${
          draggedName === name
            ? "border-teal-400 bg-teal-50 text-teal-800"
            : "border-black/10 bg-white text-slate-700 hover:bg-slate-100"
        }`}
      >
        {name}
      </button>
    ));
  }

  function renderDropZone(column: AssignmentColumnKey, names: string[]) {
    const activeDropTarget = dragTarget === column;

    return (
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragTarget(column);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragTarget(column);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragTarget((current) => (current === column ? null : current));
          }
        }}
        onDrop={(event) => handleDrop(event, column)}
        className={`min-h-28 rounded-[1.5rem] border border-dashed px-4 py-4 transition ${
          activeDropTarget
            ? "border-teal-600 bg-teal-50"
            : "border-black/10 bg-slate-50/80"
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {names.length ? (
            renderDraggablePills(names)
          ) : (
            <p className="text-sm text-slate-500">{formatPillGroupPlaceholder(column)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Night Study</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set either the Night study group or the Go back bunk group, optionally set Early party,
          and the remaining active cadets are assigned automatically.
        </p>
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
            Assignment Mode
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("NIGHT_STUDY")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                mode === "NIGHT_STUDY"
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100"
              }`}
            >
              I set Night study
            </button>
            <button
              type="button"
              onClick={() => setMode("GO_BACK_BUNK")}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                mode === "GO_BACK_BUNK"
                  ? "bg-teal-700 text-white"
                  : "border border-black/10 text-slate-700 hover:bg-slate-100"
              }`}
            >
              I set Go back bunk
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              {resolved.primaryLabel} ({resolved.primaryNames.length})
            </label>
            {renderDropZone("primary", resolved.primaryNames)}
            <textarea
              rows={10}
              value={primaryNamesText}
              onChange={(event) => setPrimaryNamesText(event.target.value)}
              placeholder="One name per line"
              className="w-full rounded-[1.5rem] border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Early party ({resolved.earlyPartyNames.length})
            </label>
            {renderDropZone("early", resolved.earlyPartyNames)}
            <textarea
              rows={10}
              value={earlyPartyNamesText}
              onChange={(event) => setEarlyPartyNamesText(event.target.value)}
              placeholder="One name per line"
              className="w-full rounded-[1.5rem] border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              {resolved.computedLabel} ({computedNames.length})
            </label>
            {renderDropZone("computed", computedNames)}
            <textarea
              rows={10}
              value={formatNightStudyNamesText(computedNames)}
              readOnly
              className="w-full rounded-[1.5rem] border border-black/10 bg-slate-50 px-4 py-3 text-slate-700 outline-none"
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Use one active cadet per line. Exact display names are accepted, and ranked names like
          `ME4T John Tan` are also recognized. You can also drag pills between columns.
        </p>

        {resolved.errors.length ? (
          <div className="mt-4 space-y-2 rounded-[1.5rem] bg-amber-50 px-4 py-4 text-sm text-amber-800">
            {resolved.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        {status ? (
          <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{status}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || resolved.errors.length > 0}
            onClick={() => {
              startTransition(async () => {
                const result = await updateNightStudyDraftAction({
                  mode,
                  primaryNamesText,
                  earlyPartyNamesText,
                });

                setStatus(result.ok ? result.message ?? "Saved." : result.error ?? "Unable to save.");
              });
            }}
            className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save Night Study"}
          </button>
        </div>
      </section>
    </div>
  );
}
