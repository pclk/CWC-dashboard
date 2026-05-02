import { Prisma, type CetActorRole } from "@prisma/client";

import { formatCetTimeRange } from "@/lib/cet";

const HISTORY_RETENTION_DAYS = 30;
const HISTORY_RETENTION_MS = HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type CetBlockSnapshot = {
  title: string;
  activityType: string;
  venueId: string | null;
  venueName: string | null;
  attireId: string | null;
  attireName: string | null;
  requiredItems: string | null;
  remarks: string | null;
  startAt: string;
  endAt: string;
  visibility: string;
  targetCadets: Array<{ id: string; name: string | null }>;
  deletedAt: string | null;
};

export type CetBlockSnapshotSource = {
  title: string;
  activityType: string;
  venueId: string | null;
  attireId: string | null;
  requiredItems: string | null;
  remarks: string | null;
  startAt: Date;
  endAt: Date;
  visibility: string;
  deletedAt: Date | null;
  venue?: { id: string; name: string } | null;
  attire?: { id: string; name: string } | null;
  targetCadets?: Array<{
    cadetId: string;
    cadet?: { id: string; displayName: string } | null;
  }>;
};

export function buildCetBlockSnapshot(block: CetBlockSnapshotSource): CetBlockSnapshot {
  return {
    title: block.title,
    activityType: block.activityType,
    venueId: block.venueId,
    venueName: block.venue?.name ?? null,
    attireId: block.attireId,
    attireName: block.attire?.name ?? null,
    requiredItems: block.requiredItems,
    remarks: block.remarks,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    visibility: block.visibility,
    targetCadets: (block.targetCadets ?? []).map((target) => ({
      id: target.cadetId,
      name: target.cadet?.displayName ?? null,
    })),
    deletedAt: block.deletedAt ? block.deletedAt.toISOString() : null,
  };
}

function formatSnapshotTimeRange(snapshot: CetBlockSnapshot) {
  return formatCetTimeRange(new Date(snapshot.startAt), new Date(snapshot.endAt));
}

function describeVisibility(snapshot: CetBlockSnapshot) {
  if (snapshot.visibility === "SELECTED_CADETS") {
    if (snapshot.targetCadets.length === 0) {
      return "selected cadets";
    }

    const names = snapshot.targetCadets
      .map((target) => target.name)
      .filter((name): name is string => Boolean(name));

    if (names.length === 0) {
      return `${snapshot.targetCadets.length} selected cadet${snapshot.targetCadets.length === 1 ? "" : "s"}`;
    }

    return names.join(", ");
  }

  return "whole cohort";
}

function compareTargetCadetIds(before: CetBlockSnapshot, after: CetBlockSnapshot) {
  const beforeIds = new Set(before.targetCadets.map((target) => target.id));
  const afterIds = new Set(after.targetCadets.map((target) => target.id));

  if (beforeIds.size !== afterIds.size) {
    return false;
  }

  for (const id of beforeIds) {
    if (!afterIds.has(id)) {
      return false;
    }
  }

  return true;
}

export function summarizeCetBlockChange(
  before: CetBlockSnapshot | null,
  after: CetBlockSnapshot | null,
): string {
  if (!before && after) {
    return `Created block "${after.title}" (${formatSnapshotTimeRange(after)}).`;
  }

  if (before && !after) {
    return `Deleted block "${before.title}" (${formatSnapshotTimeRange(before)}).`;
  }

  if (!before || !after) {
    return "Updated block.";
  }

  if (!before.deletedAt && after.deletedAt) {
    return `Deleted block "${before.title}" (${formatSnapshotTimeRange(before)}).`;
  }

  if (before.deletedAt && !after.deletedAt) {
    return `Restored block "${after.title}" (${formatSnapshotTimeRange(after)}).`;
  }

  const changes: string[] = [];

  if (before.title !== after.title) {
    changes.push(`title from "${before.title}" to "${after.title}"`);
  }

  if (before.activityType !== after.activityType) {
    changes.push(`activity from ${before.activityType} to ${after.activityType}`);
  }

  if (before.startAt !== after.startAt || before.endAt !== after.endAt) {
    changes.push(
      `time from ${formatSnapshotTimeRange(before)} to ${formatSnapshotTimeRange(after)}`,
    );
  }

  if ((before.venueName ?? before.venueId) !== (after.venueName ?? after.venueId)) {
    changes.push(
      `venue from ${before.venueName ?? "—"} to ${after.venueName ?? "—"}`,
    );
  }

  if ((before.attireName ?? before.attireId) !== (after.attireName ?? after.attireId)) {
    changes.push(
      `attire from ${before.attireName ?? "—"} to ${after.attireName ?? "—"}`,
    );
  }

  if ((before.requiredItems ?? "") !== (after.requiredItems ?? "")) {
    changes.push("required items");
  }

  if ((before.remarks ?? "") !== (after.remarks ?? "")) {
    changes.push("remarks");
  }

  if (
    before.visibility !== after.visibility ||
    !compareTargetCadetIds(before, after)
  ) {
    changes.push(
      `visibility from ${describeVisibility(before)} to ${describeVisibility(after)}`,
    );
  }

  if (changes.length === 0) {
    return `Updated block "${after.title}" (no field changes).`;
  }

  return `Changed ${changes.join("; ")}.`;
}

export type CetHistoryAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE";

export type CreateCetHistoryEntryInput = {
  userId: string;
  blockId: string | null;
  action: CetHistoryAction;
  summary: string;
  before: CetBlockSnapshot | null;
  after: CetBlockSnapshot | null;
  actorRole: CetActorRole;
  actorName: string;
};

export async function createCetHistoryEntry(
  tx: Prisma.TransactionClient,
  input: CreateCetHistoryEntryInput,
) {
  return tx.cetDayBlockHistory.create({
    data: {
      userId: input.userId,
      blockId: input.blockId,
      action: input.action,
      summary: input.summary,
      beforeJson: (input.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      afterJson: (input.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      actorRole: input.actorRole,
      actorName: input.actorName,
    },
  });
}

export async function pruneOldCetHistory(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date = new Date(),
) {
  const cutoff = new Date(now.getTime() - HISTORY_RETENTION_MS);

  return tx.cetDayBlockHistory.deleteMany({
    where: {
      userId,
      createdAt: { lt: cutoff },
    },
  });
}

export const CET_HISTORY_RETENTION_DAYS = HISTORY_RETENTION_DAYS;
