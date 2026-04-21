"use client";

import { useMemo, useState, useTransition } from "react";

import { updateNightStudyDraftAction } from "@/actions/night-study";
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

export function NightStudyManager({
  activeCadets,
  automaticOthersNames,
  initialMode,
  initialPrimaryNamesText,
  initialEarlyPartyNamesText,
  initialOtherNamesText,
}: {
  activeCadets: NightStudyCadet[];
  automaticOthersNames: string[];
  initialMode: NightStudyMode;
  initialPrimaryNamesText: string;
  initialEarlyPartyNamesText: string;
  initialOtherNamesText: string;
}) {
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
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

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
    setStatus("Others loaded from records and evening appointments.");
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateNightStudyDraftAction({
        mode,
        primaryNamesText: serializedAssignments.primaryNamesText,
        earlyPartyNamesText: serializedAssignments.earlyPartyNamesText,
        otherNamesText: serializedAssignments.otherNamesText,
      });

      if (result.ok) {
        setSavedSnapshot(currentSnapshot);
      }

      setStatus(result.ok ? result.message ?? "Saved." : result.error ?? "Unable to save.");
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
        pending={pending}
        copied={copied}
        isDirty={isDirty}
        status={status}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          clearTransientStatus();
        }}
        onSearchChange={setSearch}
        onFilterChange={setFilterGroup}
        onToggleBulkMode={handleToggleBulkMode}
        onCopySummary={handleCopySummary}
        onLoadAutomaticOthers={handleLoadAutomaticOthers}
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
