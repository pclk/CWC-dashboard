import { ensureUserConfiguration, getNightStudyCadetGroups } from "@/lib/db";
import { getSingaporeDayBounds } from "@/lib/date";
import {
  formatNightStudyNamesText,
  parseNightStudyNamesText,
  resolveNightStudyAssignments,
  type NightStudyMode,
} from "@/lib/night-study";
import { prisma } from "@/lib/prisma";

export type NightStudyCadetSyncSummary = {
  imported: number;
  nightStudy: number;
  earlyParty: number;
  goBackBunk: number;
};

export type NightStudyCadetSyncDraft = {
  mode: NightStudyMode;
  primaryNames: string[];
  earlyPartyNames: string[];
  othersNames: string[];
};

export type NightStudyCadetSyncResult =
  | {
      ok: true;
      summary: NightStudyCadetSyncSummary;
      draft: NightStudyCadetSyncDraft;
    }
  | {
      ok: false;
      error: string;
    };

export type NightStudyInitialSyncState = {
  autoSyncSummary: NightStudyCadetSyncSummary | null;
  cadetChoicesAvailableSummary: NightStudyCadetSyncSummary | null;
  autoSyncError: string | null;
};

type NightStudyDraftFields = {
  nightStudyPrimaryNamesText?: string | null;
  nightStudyEarlyPartyNamesText?: string | null;
  nightStudyOtherNamesText?: string | null;
};

function normalizeSyncName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatUniqueNightStudyNames(names: string[]) {
  return formatNightStudyNamesText(parseNightStudyNamesText(names.join("\n")));
}

function hasDraftText(value?: string | null) {
  return Boolean(value?.trim());
}

export function isNightStudyDraftEmpty(settings: NightStudyDraftFields) {
  return (
    !hasDraftText(settings.nightStudyPrimaryNamesText) &&
    !hasDraftText(settings.nightStudyEarlyPartyNamesText) &&
    !hasDraftText(settings.nightStudyOtherNamesText)
  );
}

export async function getTodayCadetNightStudyChoiceSummary(
  userId: string,
): Promise<NightStudyCadetSyncSummary> {
  const { start, end } = getSingaporeDayBounds();
  const choices = await prisma.cadetNightStudyChoice.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
      cadet: { active: true },
    },
    select: { choice: true },
  });
  const summary: NightStudyCadetSyncSummary = {
    imported: choices.length,
    nightStudy: 0,
    earlyParty: 0,
    goBackBunk: 0,
  };

  for (const choice of choices) {
    if (choice.choice === "NIGHT_STUDY") {
      summary.nightStudy += 1;
    } else if (choice.choice === "EARLY_PARTY") {
      summary.earlyParty += 1;
    } else if (choice.choice === "GO_BACK_BUNK") {
      summary.goBackBunk += 1;
    }
  }

  return summary;
}

export async function syncNightStudyDraftFromCadets(
  userId: string,
): Promise<NightStudyCadetSyncResult> {
  const { start, end } = getSingaporeDayBounds();

  await ensureUserConfiguration(userId);

  const [settings, cadetGroups, choices] = await Promise.all([
    prisma.userSettings.findUniqueOrThrow({
      where: { userId },
      select: { nightStudyDraftMode: true },
    }),
    getNightStudyCadetGroups(userId),
    prisma.cadetNightStudyChoice.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
        cadet: { active: true },
      },
      include: {
        cadet: {
          select: {
            id: true,
            displayName: true,
            sortOrder: true,
          },
        },
      },
    }),
  ]);

  const mode: NightStudyMode =
    settings.nightStudyDraftMode === "GO_BACK_BUNK" ? "GO_BACK_BUNK" : "NIGHT_STUDY";
  const activeNameByCadetId = new Map(
    cadetGroups.activeCadets.map((cadet) => [cadet.id, cadet.displayName]),
  );
  const automaticOthersSet = new Set(cadetGroups.automaticOthersNames.map(normalizeSyncName));
  const summary: NightStudyCadetSyncSummary = {
    imported: choices.length,
    nightStudy: 0,
    earlyParty: 0,
    goBackBunk: 0,
  };
  const primaryNames: string[] = [];
  const earlyPartyNames: string[] = [];

  const sortedChoices = [...choices].sort(
    (left, right) =>
      left.cadet.sortOrder - right.cadet.sortOrder ||
      left.cadet.displayName.localeCompare(right.cadet.displayName),
  );

  for (const choice of sortedChoices) {
    const cadetName = activeNameByCadetId.get(choice.cadetId) ?? choice.cadet.displayName;

    if (choice.choice === "NIGHT_STUDY") {
      summary.nightStudy += 1;
    } else if (choice.choice === "EARLY_PARTY") {
      summary.earlyParty += 1;
    } else if (choice.choice === "GO_BACK_BUNK") {
      summary.goBackBunk += 1;
    }

    if (automaticOthersSet.has(normalizeSyncName(cadetName))) {
      continue;
    }

    if (choice.choice === "EARLY_PARTY") {
      earlyPartyNames.push(cadetName);
      continue;
    }

    // The primary field means Night study or Go back bunk depending on the draft mode.
    if (
      (mode === "NIGHT_STUDY" && choice.choice === "NIGHT_STUDY") ||
      (mode === "GO_BACK_BUNK" && choice.choice === "GO_BACK_BUNK")
    ) {
      primaryNames.push(cadetName);
    }
  }

  const primaryNamesText = formatUniqueNightStudyNames(primaryNames);
  const earlyPartyNamesText = formatUniqueNightStudyNames(earlyPartyNames);
  const otherNamesText = formatNightStudyNamesText(cadetGroups.automaticOthersNames);
  const resolved = resolveNightStudyAssignments({
    mode,
    primaryNamesText,
    earlyPartyNamesText,
    otherNamesText,
    activeCadets: cadetGroups.activeCadets,
    automaticOthersNames: cadetGroups.automaticOthersNames,
  });

  if (resolved.errors.length) {
    return {
      ok: false,
      error: resolved.errors.join(" "),
    };
  }

  await prisma.userSettings.update({
    where: { userId },
    data: {
      nightStudyDraftMode: mode,
      nightStudyPrimaryNamesText: resolved.primaryNames.length
        ? resolved.primaryNames.join("\n")
        : null,
      nightStudyEarlyPartyNamesText: resolved.earlyPartyNames.length
        ? resolved.earlyPartyNames.join("\n")
        : null,
      nightStudyOtherNamesText: resolved.otherNamesText,
    },
  });

  return {
    ok: true,
    summary,
    draft: {
      mode,
      primaryNames: resolved.primaryNames,
      earlyPartyNames: resolved.earlyPartyNames,
      othersNames: resolved.othersNames,
    },
  };
}

export async function prepareNightStudyInitialSync(
  userId: string,
): Promise<NightStudyInitialSyncState> {
  await ensureUserConfiguration(userId);

  const [settings, choiceSummary] = await Promise.all([
    prisma.userSettings.findUniqueOrThrow({
      where: { userId },
      select: {
        nightStudyPrimaryNamesText: true,
        nightStudyEarlyPartyNamesText: true,
        nightStudyOtherNamesText: true,
      },
    }),
    getTodayCadetNightStudyChoiceSummary(userId),
  ]);

  if (isNightStudyDraftEmpty(settings)) {
    const result = await syncNightStudyDraftFromCadets(userId);

    return {
      autoSyncSummary: result.ok ? result.summary : null,
      cadetChoicesAvailableSummary: null,
      autoSyncError: result.ok ? null : result.error,
    };
  }

  return {
    autoSyncSummary: null,
    cadetChoicesAvailableSummary: choiceSummary.imported > 0 ? choiceSummary : null,
    autoSyncError: null,
  };
}
