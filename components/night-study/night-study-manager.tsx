"use client";

import { useMemo, useState, useTransition } from "react";

import { syncNightStudyFromCadets, updateNightStudyDraftAction } from "@/actions/night-study";
import { NightStudyBoardHeader } from "@/components/night-study/night-study-board-header";
import { NightStudyGroupSummary } from "@/components/night-study/night-study-group-summary";
import { NightStudyMobileSummaryBar } from "@/components/night-study/night-study-mobile-summary-bar";
import { NightStudyRosterList } from "@/components/night-study/night-study-roster-list";
import {
  assignManyNightStudyPeople,
  assignNightStudyPerson,
  buildNightStudyRosterPeople,
  buildNightStudySummaryText,
  filterNightStudyRosterPeople,
  getNightStudyGroupCounts,
  getNightStudyGroupMeta,
  loadNightStudyOthersFromAutomaticSources,
  resetNightStudyRosterPeople,
  resolveNightStudyAssignments,
  serializeNightStudyRosterPeople,
  type NightStudyCadet,
  type NightStudyFilter,
  type NightStudyAssignmentGroup,
  type NightStudyMode,
  type NightStudyRosterPerson,
} from "@/lib/night-study";
import type { NightStudyCadetSyncSummary } from "@/lib/night-study-sync";

function formatCadetChoiceSummary(summary: NightStudyCadetSyncSummary) {
  return `${summary.imported} cadet choices: ${summary.nightStudy} Night Study, ${summary.earlyParty} Early Party, ${summary.goBackBunk} Go Back Bunk`;
}

function buildInitialStatus(input: {
  autoSyncSummary?: NightStudyCadetSyncSummary | null;
  cadetChoicesAvailableSummary?: NightStudyCadetSyncSummary | null;
  autoSyncError?: string | null;
}) {
  if (input.autoSyncError) {
    return {
      message: `Unable to auto-sync Night Study: ${input.autoSyncError}`,
      tone: "warning" as const,
    };
  }

  if (input.autoSyncSummary) {
    return {
      message: `Auto-loaded records and appointments, then imported ${formatCadetChoiceSummary(input.autoSyncSummary)}.`,
      tone: "success" as const,
    };
  }

  if (input.cadetChoicesAvailableSummary) {
    return {
      message: `Cadet choices are available (${formatCadetChoiceSummary(input.cadetChoicesAvailableSummary)}). Use Sync with Cadets to import them.`,
      tone: "warning" as const,
    };
  }

  return {
    message: null,
    tone: "default" as const,
  };
}

export function NightStudyManager({
  activeCadets,
  automaticOthersNames,
  initialMode,
  initialPrimaryNamesText,
  initialEarlyPartyNamesText,
  initialOtherNamesText,
  initialAutoSyncSummary,
  initialCadetChoicesAvailableSummary,
  initialAutoSyncError,
}: {
  activeCadets: NightStudyCadet[];
  automaticOthersNames: string[];
  initialMode: NightStudyMode;
  initialPrimaryNamesText: string;
  initialEarlyPartyNamesText: string;
  initialOtherNamesText: string;
  initialAutoSyncSummary?: NightStudyCadetSyncSummary | null;
  initialCadetChoicesAvailableSummary?: NightStudyCadetSyncSummary | null;
  initialAutoSyncError?: string | null;
}) {
  const initialStatus = useMemo(
    () =>
      buildInitialStatus({
        autoSyncSummary: initialAutoSyncSummary,
        cadetChoicesAvailableSummary: initialCadetChoicesAvailableSummary,
        autoSyncError: initialAutoSyncError,
      }),
    [initialAutoSyncError, initialAutoSyncSummary, initialCadetChoicesAvailableSummary],
  );
  const initialResolved = useMemo(
    () =>
      resolveNightStudyAssignments({
        mode: initialMode,
        primaryNamesText: initialPrimaryNamesText,
        earlyPartyNamesText: initialEarlyPartyNamesText,
        otherNamesText: initialOtherNamesText,
        activeCadets,
        automaticOthersNames,
      }),
    [
      activeCadets,
      automaticOthersNames,
      initialEarlyPartyNamesText,
      initialMode,
      initialOtherNamesText,
      initialPrimaryNamesText,
    ],
  );
  const [mode, setMode] = useState<NightStudyMode>(initialMode);
  const [people, setPeople] = useState<NightStudyRosterPerson[]>(() =>
    buildNightStudyRosterPeople({
      activeCadets,
      primaryNames: initialResolved.primaryNames,
      earlyPartyNames: initialResolved.earlyPartyNames,
      othersNames: initialResolved.othersNames,
    }),
  );
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<NightStudyFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [status, setStatus] = useState<string | null>(initialStatus.message);
  const [statusTone, setStatusTone] = useState<"default" | "success" | "warning">(
    initialStatus.tone,
  );
  const [copied, setCopied] = useState(false);
  const [savePending, startSaveTransition] = useTransition();
  const [syncPending, startSyncTransition] = useTransition();

  const groups = useMemo(() => getNightStudyGroupMeta(mode), [mode]);
  const groupCounts = useMemo(() => getNightStudyGroupCounts(people), [people]);
  const filteredPeople = useMemo(
    () => filterNightStudyRosterPeople(people, search, filterGroup),
    [filterGroup, people, search],
  );
  const serializedAssignments = useMemo(() => serializeNightStudyRosterPeople(people), [people]);
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        mode,
        primaryNamesText: serializedAssignments.primaryNamesText,
        earlyPartyNamesText: serializedAssignments.earlyPartyNamesText,
        otherNamesText: serializedAssignments.otherNamesText,
      }),
    [
      mode,
      serializedAssignments.earlyPartyNamesText,
      serializedAssignments.otherNamesText,
      serializedAssignments.primaryNamesText,
    ],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const isDirty = currentSnapshot !== savedSnapshot;
  const editableGroups = groups;

  function clearTransientStatus() {
    setStatus(null);
    setStatusTone("default");
  }

  function handleAssign(personId: string, group: NightStudyAssignmentGroup) {
    setPeople((currentPeople) => assignNightStudyPerson(currentPeople, personId, group));
    clearTransientStatus();
  }

  function handleSelectedChange(personId: string, nextSelected: boolean) {
    setSelectedIds((currentSelectedIds) => {
      if (nextSelected) {
        return currentSelectedIds.includes(personId)
          ? currentSelectedIds
          : [...currentSelectedIds, personId];
      }

      return currentSelectedIds.filter((currentId) => currentId !== personId);
    });
  }

  function handleSelectAllFiltered() {
    const filteredIds = filteredPeople.map((person) => person.id);

    setSelectedIds((currentSelectedIds) => {
      const nextSelectedIds = new Set(currentSelectedIds);

      for (const personId of filteredIds) {
        nextSelectedIds.add(personId);
      }

      return Array.from(nextSelectedIds);
    });
  }

  function assignSelectedToGroup(group: NightStudyAssignmentGroup) {
    if (!selectedIds.length) {
      return;
    }

    setPeople((currentPeople) => assignManyNightStudyPeople(currentPeople, selectedIds, group));
    setSelectedIds([]);
    clearTransientStatus();
  }

  function handleToggleBulkMode() {
    setBulkMode((currentBulkMode) => {
      const nextBulkMode = !currentBulkMode;

      if (!nextBulkMode) {
        setSelectedIds([]);
      }

      return nextBulkMode;
    });
  }

  function handleReset() {
    if (!window.confirm("Clear all manual Night Study and Early party assignments?")) {
      return;
    }

    setPeople((currentPeople) => resetNightStudyRosterPeople(currentPeople, automaticOthersNames));
    setSelectedIds([]);
    clearTransientStatus();
  }

  async function handleCopySummary() {
    try {
      await navigator.clipboard.writeText(buildNightStudySummaryText({ people, mode }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setStatus("Unable to copy summary.");
    }
  }

  function handleLoadAutomaticOthers() {
    setPeople((currentPeople) =>
      loadNightStudyOthersFromAutomaticSources(currentPeople, automaticOthersNames),
    );
    setSelectedIds([]);
    setStatusTone("default");
    setStatus("Others loaded from records and evening appointments.");
  }

  function handleSave() {
    startSaveTransition(async () => {
      const result = await updateNightStudyDraftAction({
        mode,
        primaryNamesText: serializedAssignments.primaryNamesText,
        earlyPartyNamesText: serializedAssignments.earlyPartyNamesText,
        otherNamesText: serializedAssignments.otherNamesText,
      });

      if (result.ok) {
        setSavedSnapshot(currentSnapshot);
      }

      setStatusTone(result.ok ? "success" : "warning");
      setStatus(result.ok ? result.message ?? "Saved." : result.error ?? "Unable to save.");
    });
  }

  function handleSyncWithCadets() {
    if (
      isDirty &&
      !window.confirm("Syncing with cadets will replace unsaved Night Study edits. Continue?")
    ) {
      return;
    }

    startSyncTransition(async () => {
      const result = await syncNightStudyFromCadets();

      if (!result.ok) {
        setStatusTone("warning");
        setStatus(result.error ?? "Unable to sync cadet choices.");
        return;
      }

      const summary = result.summary;
      const summaryMessage = summary
        ? `Imported ${formatCadetChoiceSummary(summary)}.`
        : result.message ?? "Cadet choices imported.";

      setStatusTone("success");
      setStatus(summaryMessage);

      if (result.draft) {
        const nextPeople = buildNightStudyRosterPeople({
          activeCadets,
          primaryNames: result.draft.primaryNames,
          earlyPartyNames: result.draft.earlyPartyNames,
          othersNames: result.draft.othersNames,
        });
        const nextSerializedAssignments = serializeNightStudyRosterPeople(nextPeople);

        setMode(result.draft.mode);
        setPeople(nextPeople);
        setSelectedIds([]);
        setBulkMode(false);
        setSavedSnapshot(
          JSON.stringify({
            mode: result.draft.mode,
            primaryNamesText: nextSerializedAssignments.primaryNamesText,
            earlyPartyNamesText: nextSerializedAssignments.earlyPartyNamesText,
            otherNamesText: nextSerializedAssignments.otherNamesText,
          }),
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <NightStudyBoardHeader
        mode={mode}
        search={search}
        filterGroup={filterGroup}
        groups={groups}
        bulkMode={bulkMode}
        savePending={savePending}
        syncPending={syncPending}
        copied={copied}
        isDirty={isDirty}
        status={status}
        statusTone={statusTone}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          clearTransientStatus();
        }}
        onSearchChange={setSearch}
        onFilterChange={setFilterGroup}
        onToggleBulkMode={handleToggleBulkMode}
        onCopySummary={handleCopySummary}
        onLoadAutomaticOthers={handleLoadAutomaticOthers}
        onSyncWithCadets={handleSyncWithCadets}
        onReset={handleReset}
        onSave={handleSave}
      />

      <NightStudyMobileSummaryBar
        groups={groups}
        counts={groupCounts}
        activeFilter={filterGroup}
        onFilterChange={setFilterGroup}
      />

      {bulkMode && selectedIds.length ? (
        <section className="rounded-[1.5rem] border border-teal-200 bg-teal-50 px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-teal-900">
              {selectedIds.length} cadet{selectedIds.length === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap gap-2">
              {editableGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => assignSelectedToGroup(group.id)}
                  className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  Move to {group.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-2xl border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-white/80"
              >
                Clear selection
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="space-y-4">
          <NightStudyRosterList
            people={filteredPeople}
            totalCount={people.length}
            groups={groups}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            activeFilter={filterGroup}
            onClearFilter={() => setFilterGroup("all")}
            onSelectAllShown={handleSelectAllFiltered}
            onClearSelection={() => setSelectedIds([])}
            onSelectedChange={handleSelectedChange}
            onAssign={handleAssign}
          />
        </main>

        <NightStudyGroupSummary
          groups={groups}
          counts={groupCounts}
          activeFilter={filterGroup}
          totalCount={people.length}
          onFilterChange={setFilterGroup}
        />
      </div>
    </div>
  );
}
