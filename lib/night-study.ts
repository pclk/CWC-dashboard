export const NIGHT_STUDY_MODES = ["NIGHT_STUDY", "GO_BACK_BUNK"] as const;

export type NightStudyMode = (typeof NIGHT_STUDY_MODES)[number];

type NightStudyCadet = {
  rank?: string | null;
  displayName: string;
};

type ResolveNightStudyAssignmentsInput = {
  mode: NightStudyMode;
  primaryNamesText: string;
  earlyPartyNamesText: string;
  activeCadets: NightStudyCadet[];
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
    const displayName = cadet.displayName.trim();

    if (!displayName) {
      continue;
    }

    cadetLookup.set(normalizeName(displayName), cadet.displayName);

    const rankedName = [cadet.rank?.trim(), displayName].filter(Boolean).join(" ");
    if (rankedName) {
      cadetLookup.set(normalizeName(rankedName), cadet.displayName);
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
  const primaryResolved = resolveInputNames(rawPrimaryNames, cadetLookup);
  const earlyPartyResolved = resolveInputNames(rawEarlyPartyNames, cadetLookup);
  const earlyPartySet = new Set(earlyPartyResolved.resolvedNames.map(normalizeName));
  const overlapNames = primaryResolved.resolvedNames.filter((name) =>
    earlyPartySet.has(normalizeName(name)),
  );
  const overlapSet = new Set(overlapNames.map(normalizeName));
  const primaryNames = primaryResolved.resolvedNames.filter(
    (name) => !overlapSet.has(normalizeName(name)),
  );
  const earlyPartyNames = earlyPartyResolved.resolvedNames;
  const assignedNames = new Set(
    [...primaryNames, ...earlyPartyNames].map((name) => normalizeName(name)),
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

  if (overlapNames.length) {
    errors.push(
      `These personnel cannot be in both ${primaryLabel.toLowerCase()} and early party: ${overlapNames.join(", ")}.`,
    );
  }

  return {
    mode: input.mode,
    primaryLabel,
    computedLabel,
    primaryNames,
    earlyPartyNames,
    nightStudyNames: input.mode === "NIGHT_STUDY" ? primaryNames : remainingNames,
    goBackBunkNames: input.mode === "GO_BACK_BUNK" ? primaryNames : remainingNames,
    errors,
  };
}

function buildGroupRemark(label: string, names: string[]) {
  if (!names.length) {
    return null;
  }

  return `${names.length}x ${label}: ${names.join(", ")}`;
}

export function buildNightStudyRemarkSuggestions(input: {
  nightStudyNames: string[];
  earlyPartyNames: string[];
}) {
  return [
    buildGroupRemark("Night study", input.nightStudyNames),
    buildGroupRemark("Early party", input.earlyPartyNames),
  ].filter((value): value is string => Boolean(value));
}
