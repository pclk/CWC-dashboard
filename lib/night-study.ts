import type { TroopMovementRemarkSuggestion } from "@/lib/troop-movement-remarks";
import {
  getCadetFullDisplayName,
  getCadetNameAliases,
  getCadetPreferredName,
  getCadetShorthand,
} from "@/lib/cadet-names";

export const NIGHT_STUDY_MODES = ["NIGHT_STUDY", "GO_BACK_BUNK"] as const;

export type NightStudyMode = (typeof NIGHT_STUDY_MODES)[number];

export type NightStudyCadet = {
  id: string;
  displayName: string;
  shorthand?: string | null;
  fullDisplayName?: string | null;
};

export type NightStudyAssignmentGroup = "primary" | "early" | "computed" | "others";

export type NightStudyFilter = "all" | NightStudyAssignmentGroup;

export type NightStudyGroupCounts = Record<NightStudyAssignmentGroup, number>;

export type NightStudyRosterPerson = {
  id: string;
  name: string;
  shortLabel?: string | null;
  fullName?: string | null;
  assignedGroup: NightStudyAssignmentGroup;
};

export type NightStudyGroupMeta = {
  id: NightStudyAssignmentGroup;
  label: string;
  shortLabel: string;
  helperText: string;
};

type ResolveNightStudyAssignmentsInput = {
  mode: NightStudyMode;
  primaryNamesText: string;
  earlyPartyNamesText: string;
  otherNamesText?: string | null;
  activeCadets: NightStudyCadet[];
  automaticOthersNames?: string[];
};

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseNightStudyNamesText(text: string) {
  const seen = new Set<string>();
  const uniqueNames: string[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const key = normalizeName(trimmed);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueNames.push(trimmed);
  }

  return uniqueNames;
}

function buildCadetLookup(activeCadets: NightStudyCadet[]) {
  const cadetLookup = new Map<string, string>();

  for (const cadet of activeCadets) {
    const preferredName = getCadetPreferredName(cadet);

    if (!preferredName) {
      continue;
    }

    for (const alias of getCadetNameAliases(cadet)) {
      cadetLookup.set(normalizeName(alias), preferredName);
    }
  }

  return cadetLookup;
}

function resolveInputNames(rawNames: string[], cadetLookup: Map<string, string>) {
  const resolvedNames: string[] = [];
  const unknownNames: string[] = [];
  const seenResolved = new Set<string>();

  for (const rawName of rawNames) {
    const resolvedName = cadetLookup.get(normalizeName(rawName));

    if (!resolvedName) {
      unknownNames.push(rawName);
      continue;
    }

    const resolvedKey = normalizeName(resolvedName);

    if (seenResolved.has(resolvedKey)) {
      continue;
    }

    seenResolved.add(resolvedKey);
    resolvedNames.push(resolvedName);
  }

  return {
    resolvedNames,
    unknownNames,
  };
}

export function formatNightStudyNamesText(names: string[]) {
  return names.join("\n");
}

export function resolveNightStudyAssignments(input: ResolveNightStudyAssignmentsInput) {
  const primaryLabel = input.mode === "NIGHT_STUDY" ? "Night study" : "Go back bunk";
  const computedLabel = input.mode === "NIGHT_STUDY" ? "Go back bunk" : "Night study";
  const cadetLookup = buildCadetLookup(input.activeCadets);
  const rawPrimaryNames = parseNightStudyNamesText(input.primaryNamesText);
  const rawEarlyPartyNames = parseNightStudyNamesText(input.earlyPartyNamesText);
  const rawOtherNames =
    input.otherNamesText === undefined || input.otherNamesText === null
      ? input.automaticOthersNames ?? []
      : parseNightStudyNamesText(input.otherNamesText);
  const primaryResolved = resolveInputNames(rawPrimaryNames, cadetLookup);
  const earlyPartyResolved = resolveInputNames(rawEarlyPartyNames, cadetLookup);
  const otherResolved = resolveInputNames(rawOtherNames, cadetLookup);
  const primaryNames = primaryResolved.resolvedNames;
  const primarySet = new Set(primaryNames.map(normalizeName));
  const primaryEarlyOverlapNames = earlyPartyResolved.resolvedNames.filter((name) =>
    primarySet.has(normalizeName(name)),
  );
  const earlyPartyNames = earlyPartyResolved.resolvedNames.filter(
    (name) => !primarySet.has(normalizeName(name)),
  );
  const assignedManualSet = new Set([...primaryNames, ...earlyPartyNames].map(normalizeName));
  const otherOverlapNames = otherResolved.resolvedNames.filter((name) =>
    assignedManualSet.has(normalizeName(name)),
  );
  const othersNames = otherResolved.resolvedNames.filter(
    (name) => !assignedManualSet.has(normalizeName(name)),
  );
  const assignedNames = new Set(
    [...primaryNames, ...earlyPartyNames, ...othersNames].map((name) => normalizeName(name)),
  );
  const remainingNames = input.activeCadets
    .map((cadet) => cadet.displayName)
    .filter((displayName) => !assignedNames.has(normalizeName(displayName)));
  const errors: string[] = [];

  if (primaryResolved.unknownNames.length) {
    errors.push(
      `Unknown ${primaryLabel.toLowerCase()} personnel: ${primaryResolved.unknownNames.join(", ")}.`,
    );
  }

  if (earlyPartyResolved.unknownNames.length) {
    errors.push(
      `Unknown early party personnel: ${earlyPartyResolved.unknownNames.join(", ")}.`,
    );
  }

  if (otherResolved.unknownNames.length) {
    errors.push(
      `Unknown others personnel: ${otherResolved.unknownNames.join(", ")}.`,
    );
  }

  if (primaryEarlyOverlapNames.length) {
    errors.push(
      `These personnel cannot be in both ${primaryLabel.toLowerCase()} and early party: ${primaryEarlyOverlapNames.join(", ")}.`,
    );
  }

  if (otherOverlapNames.length) {
    errors.push(
      `These personnel cannot also be in Others: ${otherOverlapNames.join(", ")}.`,
    );
  }

  return {
    mode: input.mode,
    primaryLabel,
    computedLabel,
    primaryNames,
    earlyPartyNames,
    othersNames,
    otherNamesText: formatNightStudyNamesText(othersNames),
    nightStudyNames: input.mode === "NIGHT_STUDY" ? primaryNames : remainingNames,
    goBackBunkNames: input.mode === "GO_BACK_BUNK" ? primaryNames : remainingNames,
    errors,
  };
}

export function getNightStudyGroupMeta(mode: NightStudyMode): NightStudyGroupMeta[] {
  return [
    {
      id: "primary",
      label: mode === "NIGHT_STUDY" ? "Night study" : "Go back bunk",
      shortLabel: mode === "NIGHT_STUDY" ? "NS" : "GB",
      helperText: "Assigned directly by you.",
    },
    {
      id: "early",
      label: "Early party",
      shortLabel: "EP",
      helperText: "Leaves before the main group.",
    },
    {
      id: "computed",
      label: mode === "NIGHT_STUDY" ? "Go back bunk" : "Night study",
      shortLabel: mode === "NIGHT_STUDY" ? "GB" : "NS",
      helperText: "Filled automatically by the remaining eligible cadets.",
    },
    {
      id: "others",
      label: "Others",
      shortLabel: "OT",
      helperText: "Starts from records and evening appointments, but remains editable.",
    },
  ];
}

export function buildNightStudyRosterPeople(input: {
  activeCadets: NightStudyCadet[];
  primaryNames: string[];
  earlyPartyNames: string[];
  othersNames: string[];
}): NightStudyRosterPerson[] {
  const primarySet = new Set(input.primaryNames.map(normalizeName));
  const earlyPartySet = new Set(input.earlyPartyNames.map(normalizeName));
  const othersSet = new Set(input.othersNames.map(normalizeName));

  return input.activeCadets.map((cadet) => {
    const name = getCadetPreferredName(cadet);
    const fullName = getCadetFullDisplayName(cadet);
    const shortLabel = getCadetShorthand(cadet);
    const normalizedName = normalizeName(name);
    const assignedGroup: NightStudyAssignmentGroup = othersSet.has(normalizedName)
      ? "others"
      : earlyPartySet.has(normalizedName)
        ? "early"
        : primarySet.has(normalizedName)
          ? "primary"
          : "computed";

    return {
      id: cadet.id,
      name,
      shortLabel,
      fullName: normalizeName(fullName) === normalizedName ? null : fullName,
      assignedGroup,
    } satisfies NightStudyRosterPerson;
  });
}

export function getNightStudyGroupCounts(people: NightStudyRosterPerson[]): NightStudyGroupCounts {
  const counts: NightStudyGroupCounts = {
    primary: 0,
    early: 0,
    computed: 0,
    others: 0,
  };

  for (const person of people) {
    counts[person.assignedGroup] += 1;
  }

  return counts;
}

export function filterNightStudyRosterPeople(
  people: NightStudyRosterPerson[],
  search: string,
  filterGroup: NightStudyFilter,
) {
  const query = search.trim().toLowerCase();

  return people.filter((person) => {
    const matchesSearch =
      query === "" ||
      [person.name, person.shortLabel, person.fullName]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query));
    const matchesFilter = filterGroup === "all" ? true : person.assignedGroup === filterGroup;

    return matchesSearch && matchesFilter;
  });
}

export function assignNightStudyPerson(
  people: NightStudyRosterPerson[],
  personId: string,
  group: NightStudyAssignmentGroup,
): NightStudyRosterPerson[] {
  return people.map((person) => (person.id === personId ? { ...person, assignedGroup: group } : person));
}

export function assignManyNightStudyPeople(
  people: NightStudyRosterPerson[],
  personIds: string[],
  group: NightStudyAssignmentGroup,
): NightStudyRosterPerson[] {
  const selectedIds = new Set(personIds);

  return people.map((person) =>
    selectedIds.has(person.id) ? { ...person, assignedGroup: group } : person,
  );
}

export function resetNightStudyRosterPeople(
  people: NightStudyRosterPerson[],
  otherNames: string[],
): NightStudyRosterPerson[] {
  const othersSet = new Set(otherNames.map(normalizeName));

  return people.map((person) => ({
    ...person,
    assignedGroup: othersSet.has(normalizeName(person.name)) ? "others" : "computed",
  }));
}

export function loadNightStudyOthersFromAutomaticSources(
  people: NightStudyRosterPerson[],
  otherNames: string[],
): NightStudyRosterPerson[] {
  const othersSet = new Set(otherNames.map(normalizeName));

  return people.map((person) => ({
    ...person,
    assignedGroup: othersSet.has(normalizeName(person.name))
      ? "others"
      : person.assignedGroup === "others"
        ? "computed"
        : person.assignedGroup,
  }));
}

export function serializeNightStudyRosterPeople(people: NightStudyRosterPerson[]) {
  const primaryNames = people
    .filter((person) => person.assignedGroup === "primary")
    .map((person) => person.name);
  const earlyPartyNames = people
    .filter((person) => person.assignedGroup === "early")
    .map((person) => person.name);
  const otherNames = people
    .filter((person) => person.assignedGroup === "others")
    .map((person) => person.name);

  return {
    primaryNames,
    earlyPartyNames,
    otherNames,
    primaryNamesText: formatNightStudyNamesText(primaryNames),
    earlyPartyNamesText: formatNightStudyNamesText(earlyPartyNames),
    otherNamesText: formatNightStudyNamesText(otherNames),
  };
}

export function buildNightStudySummaryText(input: {
  people: NightStudyRosterPerson[];
  mode: NightStudyMode;
}) {
  const groupMeta = getNightStudyGroupMeta(input.mode);

  return groupMeta
    .map((group) => {
      const members = input.people
        .filter((person) => person.assignedGroup === group.id)
        .map((person) => person.name);

      return [`${group.label} (${members.length})`, ...(members.length ? members : ["No members"])].join(
        "\n",
      );
    })
    .join("\n\n");
}

export function buildNightStudyRemarkSuggestions(input: {
  nightStudyNames: string[];
  earlyPartyNames: string[];
}) {
  return [
    input.nightStudyNames.length
      ? ({
          group: "Night study",
          names: input.nightStudyNames,
        } satisfies TroopMovementRemarkSuggestion)
      : null,
    input.earlyPartyNames.length
      ? ({
          group: "Early party",
          names: input.earlyPartyNames,
        } satisfies TroopMovementRemarkSuggestion)
      : null,
  ].filter((value): value is TroopMovementRemarkSuggestion => Boolean(value));
}
