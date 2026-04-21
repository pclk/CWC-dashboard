import {
  getCadetFullDisplayName,
  getCadetNameAliases,
  getCadetPreferredName,
  getCadetShorthand,
} from "@/lib/cadet-names";

export type TroopMovementCadetOption = {
  rank?: string | null;
  displayName: string;
  shorthand?: string | null;
  fullDisplayName?: string | null;
};

export type TroopMovementRemarkRow = {
  countText: string;
  group: string;
  namesText: string;
};

export type TroopMovementRemarkSuggestion = {
  group: string;
  names: string[];
};

export const TROOP_MOVEMENT_STRENGTH_MODES = ["MANUAL", "SUBTRACT", "SET"] as const;

export type TroopMovementStrengthMode =
  (typeof TROOP_MOVEMENT_STRENGTH_MODES)[number];

export type TroopMovementDraftState = {
  strengthMode: TroopMovementStrengthMode;
  rows: TroopMovementRemarkRow[];
};

const STRUCTURED_REMARK_PATTERN = /^(\d+)\s*x\s+([^:]+?)(?::\s*(.*))?$/i;
const STATUS_REMARK_PATTERN = /^\d+\s*x\s+status\b/i;

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function splitExplicitRemarkNameLines(value: string) {
  return value
    .split(/\r?\n|;/)
    .map((name) => normalizeWhitespace(name))
    .filter(Boolean);
}

function hasExplicitRemarkNameSeparators(value: string) {
  return /[\n;]/.test(value);
}

function normalizeName(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function collapseName(value: string) {
  return normalizeName(value).replace(/\s+/g, "");
}

function rowHasValue(row: TroopMovementRemarkRow) {
  return Boolean(row.countText.trim() || row.group.trim() || row.namesText.trim());
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];

  for (const value of values) {
    const normalizedValue = normalizeName(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      continue;
    }

    seen.add(normalizedValue);
    uniqueValues.push(value);
  }

  return uniqueValues;
}

type CadetCandidate = {
  displayName: string;
  tokens: Set<string>;
  exactKeys: Set<string>;
  searchKeys: string[];
};

function buildCadetCandidates(activeCadets: TroopMovementCadetOption[]) {
  const candidates: CadetCandidate[] = [];
  const seenCadetNames = new Set<string>();

  for (const cadet of activeCadets) {
    const displayName = normalizeWhitespace(getCadetPreferredName(cadet));
    const fullDisplayName = normalizeWhitespace(getCadetFullDisplayName(cadet));
    const shorthand = normalizeWhitespace(getCadetShorthand(cadet) ?? "");
    const normalizedCadetName = normalizeName(fullDisplayName || displayName);
    const baseNames = [displayName, fullDisplayName, shorthand]
      .map((name) => normalizeName(name))
      .filter(Boolean);

    if (!normalizedCadetName || seenCadetNames.has(normalizedCadetName)) {
      continue;
    }

    seenCadetNames.add(normalizedCadetName);

    const exactKeys = new Set<string>(getCadetNameAliases(cadet).map(normalizeName).filter(Boolean));
    const searchKeys = Array.from(
      new Set(getCadetNameAliases(cadet).map(collapseName).filter(Boolean)),
    );

    candidates.push({
      displayName,
      tokens: new Set(baseNames.flatMap((name) => name.split(" ").filter(Boolean))),
      exactKeys,
      searchKeys,
    });
  }

  return candidates;
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function findNearestCadetName(rawName: string, candidates: CadetCandidate[]) {
  const normalizedRawName = normalizeName(rawName);
  const collapsedRawName = collapseName(rawName);

  if (!normalizedRawName || !collapsedRawName) {
    return null;
  }

  const exactMatches = candidates.filter((candidate) =>
    candidate.exactKeys.has(normalizedRawName),
  );

  if (exactMatches.length === 1) {
    return exactMatches[0]?.displayName ?? null;
  }

  const rawTokens = normalizedRawName.split(" ").filter(Boolean);

  if (rawTokens.length === 1) {
    const [rawToken] = rawTokens;
    const tokenMatches = candidates.filter((candidate) => candidate.tokens.has(rawToken));

    if (tokenMatches.length === 1) {
      return tokenMatches[0]?.displayName ?? null;
    }

    if (rawToken.length >= 3) {
      const prefixMatches = candidates.filter((candidate) =>
        Array.from(candidate.tokens).some((token) => token.startsWith(rawToken)),
      );

      if (prefixMatches.length === 1) {
        return prefixMatches[0]?.displayName ?? null;
      }
    }
  }

  if (collapsedRawName.length < 4) {
    return null;
  }

  const distances = candidates
    .map((candidate) => {
      const candidateDistance = candidate.searchKeys.reduce(
        (bestDistance, searchKey) =>
          Math.min(bestDistance, levenshteinDistance(collapsedRawName, searchKey)),
        Number.POSITIVE_INFINITY,
      );

      return {
        displayName: candidate.displayName,
        distance: candidateDistance,
      };
    })
    .sort(
      (left, right) =>
        left.distance - right.distance || left.displayName.localeCompare(right.displayName),
    );

  const bestMatch = distances[0];
  const secondBestMatch = distances[1];

  if (!bestMatch) {
    return null;
  }

  const maxDistance = Math.max(2, Math.floor(Math.max(collapsedRawName.length, 4) * 0.25));

  if (bestMatch.distance > maxDistance) {
    return null;
  }

  if (secondBestMatch && secondBestMatch.distance === bestMatch.distance) {
    return null;
  }

  return bestMatch.displayName;
}

function mapParsedNames(names: string[], mapper: (name: string) => string) {
  return dedupeStrings(names.map((name) => normalizeWhitespace(mapper(name))).filter(Boolean));
}

type ParsedCadetSequence = {
  names: string[];
  matchedCount: number;
  matchedFragmentCount: number;
};

function choosePreferredCadetSequence(
  current: ParsedCadetSequence | null,
  candidate: ParsedCadetSequence,
  expectedCount?: number,
) {
  if (!current) {
    return candidate;
  }

  if (typeof expectedCount === "number" && Number.isFinite(expectedCount) && expectedCount > 0) {
    const currentPenalty = Math.abs(current.names.length - expectedCount);
    const candidatePenalty = Math.abs(candidate.names.length - expectedCount);

    if (candidatePenalty !== currentPenalty) {
      return candidatePenalty < currentPenalty ? candidate : current;
    }
  }

  if (candidate.matchedCount !== current.matchedCount) {
    return candidate.matchedCount > current.matchedCount ? candidate : current;
  }

  if (candidate.matchedFragmentCount !== current.matchedFragmentCount) {
    return candidate.matchedFragmentCount > current.matchedFragmentCount ? candidate : current;
  }

  if (candidate.names.length !== current.names.length) {
    return candidate.names.length < current.names.length ? candidate : current;
  }

  return candidate.names.join("\u0000") < current.names.join("\u0000") ? candidate : current;
}

function recoverCadetNamesFromCommaSeparatedList(
  namesText: string,
  candidates: CadetCandidate[],
  expectedCount?: number,
) {
  const fragments = namesText
    .split(",")
    .map((name) => normalizeWhitespace(name))
    .filter(Boolean);

  if (fragments.length <= 1) {
    return [];
  }

  const exactKeyToDisplayName = new Map<string, string>();

  for (const candidate of candidates) {
    for (const exactKey of candidate.exactKeys) {
      if (!exactKeyToDisplayName.has(exactKey)) {
        exactKeyToDisplayName.set(exactKey, candidate.displayName);
      }
    }
  }

  const memo = new Map<number, ParsedCadetSequence | null>();

  function resolve(startIndex: number): ParsedCadetSequence | null {
    if (startIndex >= fragments.length) {
      return {
        names: [],
        matchedCount: 0,
        matchedFragmentCount: 0,
      };
    }

    if (memo.has(startIndex)) {
      return memo.get(startIndex) ?? null;
    }

    let best: ParsedCadetSequence | null = null;

    for (let endIndex = startIndex; endIndex < fragments.length; endIndex += 1) {
      const remainder = resolve(endIndex + 1);

      if (!remainder) {
        continue;
      }

      const rawSegment = fragments.slice(startIndex, endIndex + 1).join(", ");
      const matchedDisplayName = exactKeyToDisplayName.get(normalizeName(rawSegment));

      if (matchedDisplayName) {
        best = choosePreferredCadetSequence(
          best,
          {
            names: [matchedDisplayName, ...remainder.names],
            matchedCount: remainder.matchedCount + 1,
            matchedFragmentCount: remainder.matchedFragmentCount + (endIndex - startIndex + 1),
          },
          expectedCount,
        );
      }

      if (endIndex === startIndex) {
        best = choosePreferredCadetSequence(
          best,
          {
            names: [rawSegment, ...remainder.names],
            matchedCount: remainder.matchedCount,
            matchedFragmentCount: remainder.matchedFragmentCount,
          },
          expectedCount,
        );
      }
    }

    memo.set(startIndex, best);
    return best;
  }

  const best = resolve(0);

  if (!best || best.matchedCount === 0) {
    return [];
  }

  return dedupeStrings(best.names.map((name) => normalizeWhitespace(name)).filter(Boolean));
}

function parseTroopMovementRemarkNamesWithCadets(
  namesText: string,
  candidates: CadetCandidate[],
  expectedCount?: number,
) {
  const parsedNames = parseTroopMovementRemarkNames(namesText);

  if (
    parsedNames.length > 1 ||
    !namesText.includes(",") ||
    expectedCount === undefined ||
    expectedCount <= 1
  ) {
    return parsedNames;
  }

  const recoveredNames = recoverCadetNamesFromCommaSeparatedList(
    namesText,
    candidates,
    expectedCount,
  );

  return recoveredNames.length ? recoveredNames : parsedNames;
}

function parseTroopMovementStrengthMode(value: unknown): TroopMovementStrengthMode {
  return value === "SUBTRACT" || value === "SET" ? value : "MANUAL";
}

function normalizeDraftRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      countText: typeof item?.countText === "string" ? item.countText : "",
      group: typeof item?.group === "string" ? item.group : "",
      namesText: typeof item?.namesText === "string" ? item.namesText : "",
    }))
    .filter(rowHasValue);
}

export function createEmptyTroopMovementRemarkRow(): TroopMovementRemarkRow {
  return {
    countText: "",
    group: "",
    namesText: "",
  };
}

export function parseTroopMovementRemarkNames(namesText: string) {
  if (!namesText.trim()) {
    return [];
  }

  if (hasExplicitRemarkNameSeparators(namesText)) {
    return dedupeStrings(splitExplicitRemarkNameLines(namesText));
  }

  return dedupeStrings([normalizeWhitespace(namesText)].filter(Boolean));
}

export function formatTroopMovementRemarkNames(names: string[]) {
  return dedupeStrings(names.map(normalizeWhitespace).filter(Boolean)).join("\n");
}

export function parseTroopMovementRemarkLines(lines: string[]) {
  const rows: TroopMovementRemarkRow[] = [];

  for (const line of lines) {
    const trimmedLine = normalizeWhitespace(line);

    if (!trimmedLine || STATUS_REMARK_PATTERN.test(trimmedLine)) {
      continue;
    }

    const structuredMatch = trimmedLine.match(STRUCTURED_REMARK_PATTERN);

    if (structuredMatch) {
      const [, countText, group, namesText = ""] = structuredMatch;
      rows.push({
        countText,
        group: normalizeWhitespace(group),
        namesText: formatTroopMovementRemarkNames(parseTroopMovementRemarkNames(namesText)),
      });
      continue;
    }

    const [group, ...namesParts] = trimmedLine.split(":");
    rows.push({
      countText: "",
      group: normalizeWhitespace(group),
      namesText: normalizeWhitespace(namesParts.join(":")),
    });
  }

  return rows;
}

export function parseTroopMovementDraftText(text?: string | null): TroopMovementDraftState {
  if (!text?.trim()) {
    return {
      strengthMode: "MANUAL",
      rows: [],
    };
  }

  const trimmedText = text.trim();

  if (trimmedText.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmedText);

      return {
        strengthMode: parseTroopMovementStrengthMode(parsed?.strengthMode),
        rows: normalizeDraftRows(parsed?.rows),
      };
    } catch {
      // Fall through to support legacy formats.
    }
  }

  if (trimmedText.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmedText);

      return {
        strengthMode: "MANUAL",
        rows: normalizeDraftRows(parsed),
      };
    } catch {
      // Fall through to support legacy newline drafts.
    }
  }

  return {
    strengthMode: "MANUAL",
    rows: parseTroopMovementRemarkLines(text.split("\n")),
  };
}

export function serializeTroopMovementRemarkRows(rows: TroopMovementRemarkRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      countText: row.countText,
      group: row.group,
      namesText: row.namesText,
    })),
  );
}

export function serializeTroopMovementDraft(input: TroopMovementDraftState) {
  return JSON.stringify({
    strengthMode: input.strengthMode,
    rows: input.rows.map((row) => ({
      countText: row.countText,
      group: row.group,
      namesText: row.namesText,
    })),
  });
}

export function resolveTroopMovementRemarkRowCount(row: TroopMovementRemarkRow) {
  const parsedNames = parseTroopMovementRemarkNames(row.namesText);
  const manualCountText = row.countText.trim();

  if (parsedNames.length > 1) {
    return String(parsedNames.length);
  }

  if (parsedNames.length === 1 && (!manualCountText || hasExplicitRemarkNameSeparators(row.namesText))) {
    return "1";
  }

  return manualCountText;
}

export function getTroopMovementRemarkCount(row: TroopMovementRemarkRow) {
  const parsedCount = Number.parseInt(resolveTroopMovementRemarkRowCount(row), 10);

  if (Number.isNaN(parsedCount) || parsedCount < 1) {
    return 0;
  }

  return parsedCount;
}

export function autoCorrectTroopMovementRemarkRow(
  row: TroopMovementRemarkRow,
  activeCadets: TroopMovementCadetOption[],
) {
  if (!row.namesText.trim()) {
    return {
      ...row,
      countText: resolveTroopMovementRemarkRowCount(row),
    };
  }

  const candidates = buildCadetCandidates(activeCadets);
  const parsedCount = Number.parseInt(row.countText.trim(), 10);
  const expectedCount = Number.isNaN(parsedCount) || parsedCount < 1 ? undefined : parsedCount;
  const parsedNames = parseTroopMovementRemarkNamesWithCadets(
    row.namesText,
    candidates,
    expectedCount,
  );
  const correctedNames = mapParsedNames(parsedNames, (name) => findNearestCadetName(name, candidates) ?? name);
  const shouldNormalizeNames =
    correctedNames.length > 1 || hasExplicitRemarkNameSeparators(row.namesText) || !row.countText.trim();

  return {
    countText: shouldNormalizeNames
      ? String(correctedNames.length)
      : resolveTroopMovementRemarkRowCount(row),
    group: row.group,
    namesText: shouldNormalizeNames ? formatTroopMovementRemarkNames(correctedNames) : row.namesText,
  };
}

export function formatTroopMovementRemarkRows(rows: TroopMovementRemarkRow[]) {
  return rows
    .flatMap((row) => {
      const group = normalizeWhitespace(row.group);
      const names = parseTroopMovementRemarkNames(row.namesText);
      const countText = resolveTroopMovementRemarkRowCount(row);

      if (!group || STATUS_REMARK_PATTERN.test(`${countText || "0"}x ${group}`)) {
        return [];
      }

      if (!countText && !names.length) {
        return [group];
      }

      if (!names.length) {
        return [`${countText}x ${group}`];
      }

      return [`${countText}x ${group}: ${names.join(", ")}`];
    })
    .filter(Boolean);
}

export function buildTroopMovementStrengthText(input: {
  manualStrengthText: string;
  totalStrength: number;
  strengthMode: TroopMovementStrengthMode;
  rows: TroopMovementRemarkRow[];
}) {
  if (input.strengthMode === "MANUAL" || input.totalStrength <= 0) {
    return input.manualStrengthText;
  }

  const totalStrength = Math.max(0, Math.trunc(input.totalStrength));
  const remarkCount = input.rows.reduce((total, row) => total + getTroopMovementRemarkCount(row), 0);

  if (input.strengthMode === "SET") {
    return `${Math.min(remarkCount, totalStrength)}/${totalStrength}`;
  }

  return `${Math.max(totalStrength - remarkCount, 0)}/${totalStrength}`;
}
