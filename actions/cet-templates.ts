"use server";

import { revalidatePath } from "next/cache";

import { CetBlockSource, CetVisibility, type Prisma } from "@prisma/client";

import { failure, success, type ActionResult } from "@/actions/helpers";
import {
  combineSingaporeDateAndTimeToUtc,
  getSingaporeDayBounds,
  getSingaporeDayStart,
  getSingaporeTimeOfDay,
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
import {
  cetApplyTemplateSchema,
  cetSaveDayAsTemplateSchema,
  cetTemplateBlockDeleteSchema,
  cetTemplateBlockUpsertSchema,
  cetTemplateDeleteSchema,
  cetTemplateUpsertSchema,
  type CetApplyTemplateInput,
  type CetSaveDayAsTemplateInput,
  type CetTemplateBlockDeleteInput,
  type CetTemplateBlockUpsertInput,
  type CetTemplateDeleteInput,
  type CetTemplateUpsertInput,
} from "@/lib/validators/cet";

const TEMPLATE_BLOCK_INCLUDE = {
  venue: { select: { id: true, name: true } },
  attire: { select: { id: true, name: true } },
} satisfies Prisma.CetTemplateBlockInclude;

const DAY_BLOCK_INCLUDE = {
  venue: { select: { id: true, name: true } },
  attire: { select: { id: true, name: true } },
  targetCadets: {
    select: {
      cadetId: true,
      cadet: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.CetDayBlockInclude;

type TemplateBlockWithRelations = Prisma.CetTemplateBlockGetPayload<{
  include: typeof TEMPLATE_BLOCK_INCLUDE;
}>;

type DayBlockWithRelations = Prisma.CetDayBlockGetPayload<{
  include: typeof DAY_BLOCK_INCLUDE;
}>;

export type CetTemplateBlockView = {
  id: string;
  templateId: string;
  title: string;
  activityType: TemplateBlockWithRelations["activityType"];
  startTime: string;
  endTime: string;
  venue: { id: string; name: string } | null;
  attire: { id: string; name: string } | null;
  requiredItems: string | null;
  remarks: string | null;
  visibility: TemplateBlockWithRelations["visibility"];
};

export type CetTemplateView = {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  blocks: CetTemplateBlockView[];
};

export type CetTemplateEditorData = {
  templates: CetTemplateView[];
  venues: Array<{ id: string; name: string }>;
  attireOptions: Array<{ id: string; name: string }>;
};

function revalidateCetSurfaces() {
  revalidatePath("/cwc/cet");
  revalidatePath("/cwc/cet/templates");
  revalidatePath("/cwc/dashboard");
  revalidatePath("/cwc/instructors");
  revalidatePath("/cadet/dashboard");
}

function toTemplateBlockView(block: TemplateBlockWithRelations): CetTemplateBlockView {
  return {
    id: block.id,
    templateId: block.templateId,
    title: block.title,
    activityType: block.activityType,
    startTime: block.startTime,
    endTime: block.endTime,
    venue: block.venue ? { id: block.venue.id, name: block.venue.name } : null,
    attire: block.attire ? { id: block.attire.id, name: block.attire.name } : null,
    requiredItems: block.requiredItems,
    remarks: block.remarks,
    visibility: block.visibility,
  };
}

function toTemplateView(template: {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  blocks: TemplateBlockWithRelations[];
}): CetTemplateView {
  return {
    id: template.id,
    name: template.name,
    active: template.active,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    blocks: template.blocks.map(toTemplateBlockView),
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code?: string }).code === "P2002"
  );
}

async function resolveEditorOrFailure(): Promise<
  { ok: true; editor: CetEditor } | { ok: false; result: ActionResult }
> {
  try {
    return { ok: true, editor: await requireCetEditor() };
  } catch (error) {
    if (error instanceof CetUnauthorizedError) {
      return { ok: false, result: failure(error.message) };
    }
    throw error;
  }
}

async function assertTemplateOwnership(
  tx: Prisma.TransactionClient,
  userId: string,
  templateId: string,
) {
  const template = await tx.cetTemplate.findFirst({
    where: { id: templateId, userId, active: true },
    select: { id: true },
  });

  if (!template) {
    throw new Error("Template not found.");
  }
}

async function assertTemplateBlockOwnership(
  tx: Prisma.TransactionClient,
  userId: string,
  blockId: string,
) {
  const block = await tx.cetTemplateBlock.findFirst({
    where: { id: blockId, template: { userId, active: true } },
    select: { id: true },
  });

  if (!block) {
    throw new Error("Template block not found.");
  }
}

async function assertVenueOwnership(
  tx: Prisma.TransactionClient,
  userId: string,
  venueId: string | undefined,
) {
  if (!venueId) return;

  const venue = await tx.cetVenue.findFirst({
    where: { id: venueId, userId, active: true },
    select: { id: true },
  });

  if (!venue) {
    throw new Error("Selected venue not found.");
  }
}

async function assertAttireOwnership(
  tx: Prisma.TransactionClient,
  userId: string,
  attireId: string | undefined,
) {
  if (!attireId) return;

  const attire = await tx.cetAttire.findFirst({
    where: { id: attireId, userId, active: true },
    select: { id: true },
  });

  if (!attire) {
    throw new Error("Selected attire option not found.");
  }
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
    await assertVenueOwnership(tx, userId, venueId);
    return venueId;
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
    await assertAttireOwnership(tx, userId, attireId);
    return attireId;
  }

  return null;
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

function dayBlockToTemplateCreateData(block: DayBlockWithRelations) {
  return {
    title: block.title,
    activityType: block.activityType,
    venueId: block.venueId,
    attireId: block.attireId,
    requiredItems: block.requiredItems,
    remarks: block.remarks,
    startTime: getSingaporeTimeOfDay(block.startAt),
    endTime: getSingaporeTimeOfDay(block.endAt),
    visibility: CetVisibility.COHORT,
  };
}

function getTemplateBlockTimes(date: string, block: { startTime: string; endTime: string }) {
  return {
    startAt: combineSingaporeDateAndTimeToUtc(date, block.startTime),
    endAt: combineSingaporeDateAndTimeToUtc(date, block.endTime),
  };
}

async function writeDeleteHistory(
  tx: Prisma.TransactionClient,
  editor: CetEditor,
  block: DayBlockWithRelations,
) {
  const deleted = await tx.cetDayBlock.update({
    where: { id: block.id },
    data: {
      deletedAt: new Date(),
      deletedByRole: editor.actorRole,
      deletedByName: editor.actorName,
      updatedByRole: editor.actorRole,
      updatedByName: editor.actorName,
    },
    include: DAY_BLOCK_INCLUDE,
  });
  const before = buildCetBlockSnapshot(block);
  const after = buildCetBlockSnapshot(deleted);

  await createCetHistoryEntry(tx, {
    userId: editor.userId,
    blockId: deleted.id,
    action: "DELETE",
    summary: summarizeCetBlockChange(before, after),
    before,
    after,
    actorRole: editor.actorRole,
    actorName: editor.actorName,
  });
}

async function createDailyBlockFromTemplate(
  tx: Prisma.TransactionClient,
  editor: CetEditor,
  input: {
    scheduleId: string;
    date: string;
    block: TemplateBlockWithRelations;
  },
) {
  const { startAt, endAt } = getTemplateBlockTimes(input.date, input.block);
  const block = await tx.cetDayBlock.create({
    data: {
      userId: editor.userId,
      scheduleId: input.scheduleId,
      title: input.block.title,
      activityType: input.block.activityType,
      venueId: input.block.venueId,
      attireId: input.block.attireId,
      requiredItems: input.block.requiredItems,
      remarks: input.block.remarks,
      startAt,
      endAt,
      visibility: input.block.visibility,
      source: CetBlockSource.TEMPLATE,
      sourceId: input.block.templateId,
      createdByRole: editor.actorRole,
      createdByName: editor.actorName,
    },
    include: DAY_BLOCK_INCLUDE,
  });
  const after = buildCetBlockSnapshot(block);

  await createCetHistoryEntry(tx, {
    userId: editor.userId,
    blockId: block.id,
    action: "CREATE",
    summary: summarizeCetBlockChange(null, after),
    before: null,
    after,
    actorRole: editor.actorRole,
    actorName: editor.actorName,
  });
}

export async function getCetTemplates(): Promise<CetTemplateView[]> {
  const editor = await requireCetEditor();
  await ensureCetConfiguration(editor.userId);
  const templates = await prisma.cetTemplate.findMany({
    where: { userId: editor.userId, active: true },
    include: {
      blocks: {
        include: TEMPLATE_BLOCK_INCLUDE,
        orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { title: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return templates.map(toTemplateView);
}

export async function getCetTemplateEditorData(): Promise<CetTemplateEditorData> {
  const editor = await requireCetEditor();
  await ensureCetConfiguration(editor.userId);
  const [templates, venues, attireOptions] = await Promise.all([
    prisma.cetTemplate.findMany({
      where: { userId: editor.userId, active: true },
      include: {
        blocks: {
          include: TEMPLATE_BLOCK_INCLUDE,
          orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { title: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.cetVenue.findMany({
      where: { userId: editor.userId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.cetAttire.findMany({
      where: { userId: editor.userId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { templates: templates.map(toTemplateView), venues, attireOptions };
}

export async function createCetTemplate(
  input: CetTemplateUpsertInput,
): Promise<ActionResult & { template?: CetTemplateView }> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetTemplateUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template input.");
  }

  try {
    const template = await prisma.cetTemplate.upsert({
      where: { userId_name: { userId: auth.editor.userId, name: parsed.data.name } },
      create: { userId: auth.editor.userId, name: parsed.data.name },
      update: { active: true },
      include: { blocks: { include: TEMPLATE_BLOCK_INCLUDE } },
    });

    revalidateCetSurfaces();
    return { ...success("Template created."), template: toTemplateView(template) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return failure("A template with that name already exists.");
    }
    throw error;
  }
}

export async function updateCetTemplate(
  input: CetTemplateUpsertInput,
): Promise<ActionResult & { template?: CetTemplateView }> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetTemplateUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template input.");
  }

  if (!parsed.data.id) {
    return failure("Template id is required.");
  }

  try {
    const template = await prisma.$transaction(async (tx) => {
      await assertTemplateOwnership(tx, auth.editor.userId, parsed.data.id as string);
      return tx.cetTemplate.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name },
        include: { blocks: { include: TEMPLATE_BLOCK_INCLUDE } },
      });
    });

    revalidateCetSurfaces();
    return { ...success("Template updated."), template: toTemplateView(template) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return failure("A template with that name already exists.");
    }
    return failure(error instanceof Error ? error.message : "Failed to update template.");
  }
}

export async function deleteCetTemplate(input: CetTemplateDeleteInput): Promise<ActionResult> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetTemplateDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template selection.");
  }

  const updated = await prisma.cetTemplate.updateMany({
    where: { id: parsed.data.templateId, userId: auth.editor.userId, active: true },
    data: { active: false },
  });

  if (updated.count === 0) {
    return failure("Template not found or already deleted.");
  }

  revalidateCetSurfaces();
  return success("Template deleted.");
}

export async function createCetTemplateBlock(
  input: CetTemplateBlockUpsertInput,
): Promise<ActionResult & { block?: CetTemplateBlockView }> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetTemplateBlockUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template block input.");
  }

  try {
    const block = await prisma.$transaction(async (tx) => {
      await assertTemplateOwnership(tx, auth.editor.userId, parsed.data.templateId);
      const venueId = await resolveVenueId(
        tx,
        auth.editor.userId,
        parsed.data.venueId || undefined,
        parsed.data.createVenueName || undefined,
      );
      const attireId = await resolveAttireId(
        tx,
        auth.editor.userId,
        parsed.data.attireId || undefined,
        parsed.data.createAttireName || undefined,
      );

      return tx.cetTemplateBlock.create({
        data: {
          templateId: parsed.data.templateId,
          title: parsed.data.title,
          activityType: parsed.data.activityType,
          venueId,
          attireId,
          requiredItems: parsed.data.requiredItems?.trim() || null,
          remarks: parsed.data.remarks?.trim() || null,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          visibility: parsed.data.visibility ?? CetVisibility.COHORT,
        },
        include: TEMPLATE_BLOCK_INCLUDE,
      });
    });

    revalidateCetSurfaces();
    return { ...success("Template block created."), block: toTemplateBlockView(block) };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to create template block.");
  }
}

export async function updateCetTemplateBlock(
  input: CetTemplateBlockUpsertInput,
): Promise<ActionResult & { block?: CetTemplateBlockView }> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetTemplateBlockUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template block input.");
  }

  if (!parsed.data.id) {
    return failure("Template block id is required.");
  }

  try {
    const block = await prisma.$transaction(async (tx) => {
      await assertTemplateOwnership(tx, auth.editor.userId, parsed.data.templateId);
      await assertTemplateBlockOwnership(tx, auth.editor.userId, parsed.data.id as string);
      const venueId = await resolveVenueId(
        tx,
        auth.editor.userId,
        parsed.data.venueId || undefined,
        parsed.data.createVenueName || undefined,
      );
      const attireId = await resolveAttireId(
        tx,
        auth.editor.userId,
        parsed.data.attireId || undefined,
        parsed.data.createAttireName || undefined,
      );

      return tx.cetTemplateBlock.update({
        where: { id: parsed.data.id },
        data: {
          templateId: parsed.data.templateId,
          title: parsed.data.title,
          activityType: parsed.data.activityType,
          venueId,
          attireId,
          requiredItems: parsed.data.requiredItems?.trim() || null,
          remarks: parsed.data.remarks?.trim() || null,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          visibility: parsed.data.visibility ?? CetVisibility.COHORT,
        },
        include: TEMPLATE_BLOCK_INCLUDE,
      });
    });

    revalidateCetSurfaces();
    return { ...success("Template block updated."), block: toTemplateBlockView(block) };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to update template block.");
  }
}

export async function deleteCetTemplateBlock(
  input: CetTemplateBlockDeleteInput,
): Promise<ActionResult> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetTemplateBlockDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template block selection.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await assertTemplateBlockOwnership(tx, auth.editor.userId, parsed.data.blockId);
      await tx.cetTemplateBlock.delete({ where: { id: parsed.data.blockId } });
    });

    revalidateCetSurfaces();
    return success("Template block deleted.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to delete template block.");
  }
}

export async function saveDayAsTemplate(
  input: CetSaveDayAsTemplateInput,
): Promise<ActionResult & { template?: CetTemplateView }> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetSaveDayAsTemplateSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid save-template input.");
  }

  const { start, end } = getSingaporeDayBounds(parsed.data.date);

  try {
    const template = await prisma.$transaction(async (tx) => {
      const blocks = await tx.cetDayBlock.findMany({
        where: {
          userId: auth.editor.userId,
          deletedAt: null,
          startAt: { gte: start, lte: end },
          source: { in: [CetBlockSource.MANUAL, CetBlockSource.TEMPLATE] },
        },
        include: DAY_BLOCK_INCLUDE,
        orderBy: [{ startAt: "asc" }, { endAt: "asc" }, { title: "asc" }],
      });
      const created = await tx.cetTemplate.create({
        data: {
          userId: auth.editor.userId,
          name: parsed.data.templateName,
          blocks: {
            create: blocks.map(dayBlockToTemplateCreateData),
          },
        },
        include: {
          blocks: {
            include: TEMPLATE_BLOCK_INCLUDE,
            orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { title: "asc" }],
          },
        },
      });

      return created;
    });

    revalidateCetSurfaces();
    return { ...success("Template saved from day."), template: toTemplateView(template) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return failure("A template with that name already exists.");
    }
    return failure(error instanceof Error ? error.message : "Failed to save day as template.");
  }
}

export async function applyTemplateToDate(input: CetApplyTemplateInput): Promise<ActionResult> {
  const auth = await resolveEditorOrFailure();
  if (!auth.ok) return auth.result;
  const parsed = cetApplyTemplateSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template application input.");
  }

  const dayStart = getSingaporeDayStart(parsed.data.date);
  const { start, end } = getSingaporeDayBounds(parsed.data.date);

  try {
    await prisma.$transaction(async (tx) => {
      const template = await tx.cetTemplate.findFirst({
        where: {
          id: parsed.data.templateId,
          userId: auth.editor.userId,
          active: true,
        },
        select: {
          id: true,
          blocks: {
            include: TEMPLATE_BLOCK_INCLUDE,
            orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { title: "asc" }],
          },
        },
      });

      if (!template) {
        throw new Error("Template not found.");
      }

      const schedule = await ensureSchedule(tx, auth.editor.userId, dayStart);

      if (parsed.data.mode === "REPLACE") {
        const existingBlocks = await tx.cetDayBlock.findMany({
          where: {
            userId: auth.editor.userId,
            deletedAt: null,
            startAt: { gte: start, lte: end },
            source: { not: CetBlockSource.APPOINTMENT_IMPORT },
          },
          include: DAY_BLOCK_INCLUDE,
          orderBy: [{ startAt: "asc" }, { endAt: "asc" }, { title: "asc" }],
        });

        for (const block of existingBlocks) {
          await writeDeleteHistory(tx, auth.editor, block);
        }
      }

      for (const block of template.blocks) {
        await createDailyBlockFromTemplate(tx, auth.editor, {
          scheduleId: schedule.id,
          date: parsed.data.date,
          block,
        });
      }

      await pruneOldCetHistory(tx, auth.editor.userId);
    });

    revalidateCetSurfaces();
    return success("Template applied to date.");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to apply template.");
  }
}
