"use server";

import { revalidatePath } from "next/cache";

import { CetBlockSource, CetVisibility, type Prisma } from "@prisma/client";

import { failure, success, type ActionResult } from "@/actions/helpers";
import {
  combineSingaporeDateAndTimeToUtc,
  addSingaporeDays,
  getSingaporeIsoDate,
  getSingaporeDayBounds,
  getSingaporeDayStart,
  getSingaporeToday,
} from "@/lib/cet";
import { CetUnauthorizedError, requireCetEditor, type CetEditor } from "@/lib/cet-auth";
import { ensureCetConfiguration } from "@/lib/cet-configuration";
import {
  buildCetBlockSnapshot,
  createCetHistoryEntry,
  pruneOldCetHistory,
  summarizeCetBlockChange,
} from "@/lib/cet-history";
import { prisma } from "@/lib/prisma";
import { getCetTimelineForEditor, type CetTimelineBlock } from "@/lib/cet-read";
import {
  cetDayBlockDeleteSchema,
  cetDayBlockUpsertSchema,
  type CetDayBlockUpsertInput,
} from "@/lib/validators/cet";

const BLOCK_INCLUDE = {
  venue: { select: { id: true, name: true } },
  attire: { select: { id: true, name: true } },
  targetCadets: {
    select: {
      cadetId: true,
      cadet: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.CetDayBlockInclude;

type CetBlockWithRelations = Prisma.CetDayBlockGetPayload<{
  include: typeof BLOCK_INCLUDE;
}>;

export type CetDayBlockView = {
  id: string;
  scheduleId: string;
  title: string;
  activityType: CetBlockWithRelations["activityType"];
  startAt: Date;
  endAt: Date;
  venue: { id: string; name: string } | null;
  attire: { id: string; name: string } | null;
  requiredItems: string | null;
  remarks: string | null;
  visibility: CetVisibility;
  source: CetBlockSource;
  targetCadets: Array<{ id: string; name: string }>;
  createdByRole: CetBlockWithRelations["createdByRole"];
  createdByName: string;
  updatedByRole: CetBlockWithRelations["updatedByRole"];
  updatedByName: string | null;
};

export type CetDayHistoryView = {
  id: string;
  blockId: string | null;
  action: string;
  summary: string;
  actorRole: CetBlockWithRelations["createdByRole"];
  actorName: string;
  createdAt: Date;
  beforeJson: Prisma.JsonValue | null;
  afterJson: Prisma.JsonValue | null;
};

export type CetDayEditorData = {
  date: string;
  schedule: { id: string; date: Date; title: string | null } | null;
  blocks: CetDayBlockView[];
  venues: Array<{ id: string; name: string }>;
  attireOptions: Array<{ id: string; name: string }>;
  cadets: Array<{ id: string; displayName: string }>;
  templates: Array<{ id: string; name: string; blockCount: number }>;
  history: CetDayHistoryView[];
};

export type CetEditorPageData = {
  selectedDate: string;
  previousWeekDate: string;
  nextWeekDate: string;
  editorData: CetDayEditorData;
  timeline: CetTimelineBlock[];
};

function revalidateCetSurfaces() {
  revalidatePath("/cwc/cet");
  revalidatePath("/cwc/dashboard");
  revalidatePath("/cwc/instructors");
  revalidatePath("/cadet/dashboard");
}

function toBlockView(block: CetBlockWithRelations): CetDayBlockView {
  return {
    id: block.id,
    scheduleId: block.scheduleId,
    title: block.title,
    activityType: block.activityType,
    startAt: block.startAt,
    endAt: block.endAt,
    venue: block.venue ? { id: block.venue.id, name: block.venue.name } : null,
    attire: block.attire ? { id: block.attire.id, name: block.attire.name } : null,
    requiredItems: block.requiredItems,
    remarks: block.remarks,
    visibility: block.visibility,
    source: block.source,
    targetCadets: block.targetCadets
      .filter((target) => Boolean(target.cadet))
      .map((target) => ({
        id: target.cadetId,
        name: target.cadet?.displayName ?? "",
      })),
    createdByRole: block.createdByRole,
    createdByName: block.createdByName,
    updatedByRole: block.updatedByRole,
    updatedByName: block.updatedByName,
  };
}

type CetHistorySnapshot = {
  startAt?: unknown;
  endAt?: unknown;
};

function parseHistorySnapshot(value: Prisma.JsonValue | null): CetHistorySnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

function snapshotOverlapsDay(snapshot: CetHistorySnapshot | null, start: Date, end: Date) {
  if (!snapshot || typeof snapshot.startAt !== "string" || typeof snapshot.endAt !== "string") {
    return false;
  }

  const startAt = new Date(snapshot.startAt);
  const endAt = new Date(snapshot.endAt);

  return (
    !Number.isNaN(startAt.getTime()) &&
    !Number.isNaN(endAt.getTime()) &&
    startAt <= end &&
    endAt >= start
  );
}

function historyEntryBelongsToDate(
  entry: {
    beforeJson: Prisma.JsonValue | null;
    afterJson: Prisma.JsonValue | null;
    createdAt: Date;
    block: { startAt: Date; endAt: Date } | null;
  },
  start: Date,
  end: Date,
) {
  const before = parseHistorySnapshot(entry.beforeJson);
  const after = parseHistorySnapshot(entry.afterJson);

  return (
    snapshotOverlapsDay(before, start, end) ||
    snapshotOverlapsDay(after, start, end) ||
    Boolean(entry.block && entry.block.startAt <= end && entry.block.endAt >= start) ||
    (entry.createdAt >= start && entry.createdAt <= end)
  );
}

async function loadEditorContext(userId: string, dateInput: string | Date) {
  const dayStart = getSingaporeDayStart(dateInput);
  const { start, end } = getSingaporeDayBounds(dateInput);

  const [schedule, venues, attireOptions, cadets, templates, history] = await Promise.all([
    prisma.cetDaySchedule.findUnique({
      where: { userId_date: { userId, date: dayStart } },
      select: {
        id: true,
        date: true,
        title: true,
        blocks: {
          where: { deletedAt: null },
          orderBy: { startAt: "asc" },
          include: BLOCK_INCLUDE,
        },
      },
    }),
    prisma.cetVenue.findMany({
      where: { userId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.cetAttire.findMany({
      where: { userId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.cadet.findMany({
      where: { userId, active: true },
      select: { id: true, displayName: true },
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    }),
    prisma.cetTemplate.findMany({
      where: { userId, active: true },
      select: {
        id: true,
        name: true,
        _count: { select: { blocks: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.cetDayBlockHistory.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        blockId: true,
        action: true,
        summary: true,
        actorRole: true,
        actorName: true,
        createdAt: true,
        beforeJson: true,
        afterJson: true,
        block: { select: { startAt: true, endAt: true } },
      },
    }),
  ]);

  return {
    dayStart,
    schedule,
    venues,
    attireOptions,
    cadets,
    templates,
    history: history.filter((entry) => historyEntryBelongsToDate(entry, start, end)),
  };
}

async function getCetDayEditorDataForUser(
  userId: string,
  date: string,
): Promise<CetDayEditorData> {
  const { schedule, venues, attireOptions, cadets, templates, history } =
    await loadEditorContext(userId, date);

  return {
    date,
    schedule: schedule
      ? { id: schedule.id, date: schedule.date, title: schedule.title }
      : null,
    blocks: (schedule?.blocks ?? []).map(toBlockView),
    venues,
    attireOptions,
    cadets,
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      blockCount: template._count.blocks,
    })),
    history: history.map((entry) => ({
      id: entry.id,
      blockId: entry.blockId,
      action: entry.action,
      summary: entry.summary,
      actorRole: entry.actorRole,
      actorName: entry.actorName,
      createdAt: entry.createdAt,
      beforeJson: entry.beforeJson,
      afterJson: entry.afterJson,
    })),
  };
}

export async function getCetDayEditorData(date: string): Promise<CetDayEditorData> {
  const editor = await requireCetEditor();
  await ensureCetConfiguration(editor.userId);
  return getCetDayEditorDataForUser(editor.userId, date);
}

export async function getCetEditorPageData(date?: string): Promise<CetEditorPageData> {
  const editor = await requireCetEditor();
  await ensureCetConfiguration(editor.userId);
  const selectedDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : getSingaporeIsoDate(getSingaporeToday());
  const selectedDay = new Date(`${selectedDate}T00:00:00+08:00`);
  const [editorData, timeline] = await Promise.all([
    getCetDayEditorDataForUser(editor.userId, selectedDate),
    getCetTimelineForEditor(editor.userId, selectedDate),
  ]);

  return {
    selectedDate,
    previousWeekDate: getSingaporeIsoDate(addSingaporeDays(selectedDay, -7)),
    nextWeekDate: getSingaporeIsoDate(addSingaporeDays(selectedDay, 7)),
    editorData,
    timeline,
  };
}

async function ensureSchedule(
  tx: Prisma.TransactionClient,
  userId: string,
  date: Date,
) {
  return tx.cetDaySchedule.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date },
    select: { id: true },
  });
}

async function resolveVenueId(
  tx: Prisma.TransactionClient,
  userId: string,
  venueId: string | undefined,
  createVenueName: string | undefined,
): Promise<string | null> {
  const trimmedName = (createVenueName ?? "").trim();

  if (trimmedName) {
    const venue = await tx.cetVenue.upsert({
      where: { userId_name: { userId, name: trimmedName } },
      create: { userId, name: trimmedName },
      update: { active: true },
      select: { id: true },
    });
    return venue.id;
  }

  if (venueId) {
    const venue = await tx.cetVenue.findFirst({
      where: { id: venueId, userId, active: true },
      select: { id: true },
    });

    if (!venue) {
      throw new Error("Selected venue not found.");
    }

    return venue.id;
  }

  return null;
}

async function resolveAttireId(
  tx: Prisma.TransactionClient,
  userId: string,
  attireId: string | undefined,
  createAttireName: string | undefined,
): Promise<string | null> {
  const trimmedName = (createAttireName ?? "").trim();

  if (trimmedName) {
    const attire = await tx.cetAttire.upsert({
      where: { userId_name: { userId, name: trimmedName } },
      create: { userId, name: trimmedName },
      update: { active: true },
      select: { id: true },
    });
    return attire.id;
  }

  if (attireId) {
    const attire = await tx.cetAttire.findFirst({
      where: { id: attireId, userId, active: true },
      select: { id: true },
    });

    if (!attire) {
      throw new Error("Selected attire option not found.");
    }

    return attire.id;
  }

  return null;
}

async function assertCadetOwnership(
  tx: Prisma.TransactionClient,
  userId: string,
  cadetIds: string[],
) {
  if (cadetIds.length === 0) return;

  const owned = await tx.cadet.findMany({
    where: { userId, active: true, id: { in: cadetIds } },
    select: { id: true },
  });

  if (owned.length !== new Set(cadetIds).size) {
    throw new Error("One or more selected cadets are not available.");
  }
}

async function resolveEditorOrFailure(): Promise<
  { ok: true; editor: CetEditor } | { ok: false; result: ActionResult }
> {
  try {
    const editor = await requireCetEditor();
    return { ok: true, editor };
  } catch (error) {
    if (error instanceof CetUnauthorizedError) {
      return { ok: false, result: failure(error.message) };
    }
    throw error;
  }
}

function parseTimes(input: CetDayBlockUpsertInput) {
  let startAt: Date;
  let endAt: Date;

  try {
    startAt = combineSingaporeDateAndTimeToUtc(input.date, input.startTime);
    endAt = combineSingaporeDateAndTimeToUtc(input.date, input.endTime);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid date or time.");
  }

  return { startAt, endAt };
}

export async function createCetDayBlockAction(
  input: CetDayBlockUpsertInput,
): Promise<ActionResult> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const editor = auth.editor;

  const parsed = cetDayBlockUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid CET block input.");
  }

  let startAt: Date;
  let endAt: Date;
  let dayStart: Date;

  try {
    ({ startAt, endAt } = parseTimes(parsed.data));
    dayStart = getSingaporeDayStart(parsed.data.date);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Invalid date or time.");
  }

  const targetIds =
    parsed.data.visibility === CetVisibility.SELECTED_CADETS
      ? [...new Set(parsed.data.targetCadetIds)]
      : [];

  try {
    await prisma.$transaction(async (tx) => {
      await assertCadetOwnership(tx, editor.userId, targetIds);

      const schedule = await ensureSchedule(tx, editor.userId, dayStart);
      const venueId = await resolveVenueId(
        tx,
        editor.userId,
        parsed.data.venueId || undefined,
        parsed.data.createVenueName || undefined,
      );
      const attireId = await resolveAttireId(
        tx,
        editor.userId,
        parsed.data.attireId || undefined,
        parsed.data.createAttireName || undefined,
      );

      const block = await tx.cetDayBlock.create({
        data: {
          userId: editor.userId,
          scheduleId: schedule.id,
          title: parsed.data.title,
          activityType: parsed.data.activityType,
          venueId,
          attireId,
          requiredItems: parsed.data.requiredItems?.trim() || null,
          remarks: parsed.data.remarks?.trim() || null,
          startAt,
          endAt,
          visibility: parsed.data.visibility,
          source: CetBlockSource.MANUAL,
          createdByRole: editor.actorRole,
          createdByName: editor.actorName,
          targetCadets:
            targetIds.length > 0
              ? { create: targetIds.map((cadetId) => ({ cadetId })) }
              : undefined,
        },
        include: BLOCK_INCLUDE,
      });

      const snapshot = buildCetBlockSnapshot(block);
      const summary = summarizeCetBlockChange(null, snapshot);

      await createCetHistoryEntry(tx, {
        userId: editor.userId,
        blockId: block.id,
        action: "CREATE",
        summary,
        before: null,
        after: snapshot,
        actorRole: editor.actorRole,
        actorName: editor.actorName,
      });

      await pruneOldCetHistory(tx, editor.userId);
    });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to create CET block.");
  }

  revalidateCetSurfaces();
  return success("CET block created.");
}

export async function updateCetDayBlockAction(
  input: CetDayBlockUpsertInput,
): Promise<ActionResult> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const editor = auth.editor;

  const parsed = cetDayBlockUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid CET block input.");
  }

  if (!parsed.data.id) {
    return failure("Block id is required for updates.");
  }

  const blockId = parsed.data.id;

  let startAt: Date;
  let endAt: Date;
  let dayStart: Date;

  try {
    ({ startAt, endAt } = parseTimes(parsed.data));
    dayStart = getSingaporeDayStart(parsed.data.date);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Invalid date or time.");
  }

  const targetIds =
    parsed.data.visibility === CetVisibility.SELECTED_CADETS
      ? [...new Set(parsed.data.targetCadetIds)]
      : [];

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.cetDayBlock.findUnique({
        where: { id: blockId },
        include: BLOCK_INCLUDE,
      });

      if (!existing || existing.userId !== editor.userId) {
        throw new Error("CET block not found.");
      }

      if (existing.deletedAt) {
        throw new Error("Cannot edit a deleted CET block.");
      }

      if (existing.source === CetBlockSource.APPOINTMENT_IMPORT) {
        throw new Error("Imported appointment blocks cannot be edited here.");
      }

      await assertCadetOwnership(tx, editor.userId, targetIds);

      const schedule = await ensureSchedule(tx, editor.userId, dayStart);
      const venueId = await resolveVenueId(
        tx,
        editor.userId,
        parsed.data.venueId || undefined,
        parsed.data.createVenueName || undefined,
      );
      const attireId = await resolveAttireId(
        tx,
        editor.userId,
        parsed.data.attireId || undefined,
        parsed.data.createAttireName || undefined,
      );

      const before = buildCetBlockSnapshot(existing);

      await tx.cetDayBlockTargetCadet.deleteMany({ where: { blockId } });

      const updated = await tx.cetDayBlock.update({
        where: { id: blockId },
        data: {
          scheduleId: schedule.id,
          title: parsed.data.title,
          activityType: parsed.data.activityType,
          venueId,
          attireId,
          requiredItems: parsed.data.requiredItems?.trim() || null,
          remarks: parsed.data.remarks?.trim() || null,
          startAt,
          endAt,
          visibility: parsed.data.visibility,
          updatedByRole: editor.actorRole,
          updatedByName: editor.actorName,
          targetCadets:
            targetIds.length > 0
              ? { create: targetIds.map((cadetId) => ({ cadetId })) }
              : undefined,
        },
        include: BLOCK_INCLUDE,
      });

      const after = buildCetBlockSnapshot(updated);
      const summary = summarizeCetBlockChange(before, after);

      await createCetHistoryEntry(tx, {
        userId: editor.userId,
        blockId: updated.id,
        action: "UPDATE",
        summary,
        before,
        after,
        actorRole: editor.actorRole,
        actorName: editor.actorName,
      });

      await pruneOldCetHistory(tx, editor.userId);
    });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to update CET block.");
  }

  revalidateCetSurfaces();
  return success("CET block updated.");
}

export async function deleteCetDayBlockAction(
  input: { blockId: string },
): Promise<ActionResult> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const editor = auth.editor;

  const parsed = cetDayBlockDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid CET block selection.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.cetDayBlock.findUnique({
        where: { id: parsed.data.blockId },
        include: BLOCK_INCLUDE,
      });

      if (!existing || existing.userId !== editor.userId) {
        throw new Error("CET block not found.");
      }

      if (existing.deletedAt) {
        throw new Error("CET block already removed.");
      }

      if (existing.source === CetBlockSource.APPOINTMENT_IMPORT) {
        throw new Error("Imported appointment blocks cannot be deleted here.");
      }

      const before = buildCetBlockSnapshot(existing);
      const deletedAt = new Date();

      const deleted = await tx.cetDayBlock.update({
        where: { id: parsed.data.blockId },
        data: {
          deletedAt,
          deletedByRole: editor.actorRole,
          deletedByName: editor.actorName,
          updatedByRole: editor.actorRole,
          updatedByName: editor.actorName,
        },
        include: BLOCK_INCLUDE,
      });

      const after = buildCetBlockSnapshot(deleted);
      const summary = summarizeCetBlockChange(before, after);

      await createCetHistoryEntry(tx, {
        userId: editor.userId,
        blockId: deleted.id,
        action: "DELETE",
        summary,
        before,
        after,
        actorRole: editor.actorRole,
        actorName: editor.actorName,
      });

      await pruneOldCetHistory(tx, editor.userId);
    });
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to delete CET block.");
  }

  revalidateCetSurfaces();
  return success("CET block removed.");
}
