type CadetNameSource = {
  rank?: string | null;
  displayName: string;
  shorthand?: string | null;
  fullDisplayName?: string | null;
};

function normalizeCadetText(value?: string | null) {
  const trimmed = value?.trim().replace(/\s+/g, " ");

  return trimmed ? trimmed : null;
}

function dedupeCadetNames(values: Array<string | null>) {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];

  for (const value of values) {
    const normalizedValue = normalizeCadetText(value);

    if (!normalizedValue) {
      continue;
    }

    const key = normalizedValue.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueValues.push(normalizedValue);
  }

  return uniqueValues;
}

export function getCadetFullDisplayName(cadet: CadetNameSource) {
  return normalizeCadetText(cadet.fullDisplayName) ?? normalizeCadetText(cadet.displayName) ?? "";
}

export function getCadetShorthand(cadet: CadetNameSource) {
  return normalizeCadetText(cadet.shorthand);
}

export function getCadetPreferredName(cadet: CadetNameSource) {
  return getCadetShorthand(cadet) ?? getCadetFullDisplayName(cadet);
}

export function getCadetNameAliases(cadet: CadetNameSource) {
  const baseNames = dedupeCadetNames([
    getCadetPreferredName(cadet),
    getCadetFullDisplayName(cadet),
    getCadetShorthand(cadet),
  ]);
  const rank = normalizeCadetText(cadet.rank);

  if (!rank) {
    return baseNames;
  }

  return dedupeCadetNames([
    ...baseNames,
    ...baseNames.map((name) => `${rank} ${name}`),
  ]);
}
