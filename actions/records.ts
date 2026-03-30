"use server";

import { ResolutionState } from "@prisma/client";

import { failure, parseCheckbox, parseNumber, parseOptionalString, revalidateOperationalPages, success, type ActionResult } from "@/actions/helpers";
import { assertCadetOwnership, assertRecordOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { deriveResolutionState } from "@/lib/strength";
import { parseSingaporeInputToUtc } from "@/lib/date";
import { recordDeleteSchema, recordResolveSchema, recordSchema } from "@/lib/validators/record";

export async function upsertRecordAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = recordSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    cadetId: parseOptionalString(formData.get("cadetId")),
    category: parseOptionalString(formData.get("category")),
    title: parseOptionalString(formData.get("title")),
    details: parseOptionalString(formData.get("details")),
    startAt: parseOptionalString(formData.get("startAt")),
    endAt: parseOptionalString(formData.get("endAt")),
    affectsStrength: parseCheckbox(formData.get("affectsStrength")),
    countsNotInCamp: parseCheckbox(formData.get("countsNotInCamp")),
    sortOrder: parseNumber(formData.get("sortOrder")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid record payload.");
  }

  await assertCadetOwnership(userId, parsed.data.cadetId);

  const startAt = parseSingaporeInputToUtc(parsed.data.startAt);
  const endAt = parseSingaporeInputToUtc(parsed.data.endAt);
  const resolutionState = deriveResolutionState({
    endAt,
    resolutionState: ResolutionState.ACTIVE,
  });

  if (parsed.data.id) {
    await assertRecordOwnership(userId, parsed.data.id);

    await prisma.cadetRecord.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        cadetId: parsed.data.cadetId,
        category: parsed.data.category,
        title: parsed.data.title || null,
        details: parsed.data.details || null,
        startAt,
        endAt,
        affectsStrength: parsed.data.affectsStrength,
        countsNotInCamp: parsed.data.countsNotInCamp,
        sortOrder: parsed.data.sortOrder,
        resolutionState,
        resolvedAt: resolutionState === ResolutionState.RESOLVED ? new Date() : null,
      },
    });
  } else {
    await prisma.cadetRecord.create({
      data: {
        userId,
        cadetId: parsed.data.cadetId,
        category: parsed.data.category,
        title: parsed.data.title || null,
        details: parsed.data.details || null,
        startAt,
        endAt,
        affectsStrength: parsed.data.affectsStrength,
        countsNotInCamp: parsed.data.countsNotInCamp,
        sortOrder: parsed.data.sortOrder,
        resolutionState,
      },
    });
  }

  revalidateOperationalPages();
  return success(parsed.data.id ? "Record updated." : "Record created.");
}

export async function resolveRecordAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = recordResolveSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid record.");
  }

  await assertRecordOwnership(userId, parsed.data.id);

  await prisma.cadetRecord.update({
    where: {
      id: parsed.data.id,
    },
    data: {
      resolutionState: ResolutionState.RESOLVED,
      resolvedAt: new Date(),
    },
  });

  revalidateOperationalPages();
  return success("Record resolved.");
}

export async function deleteRecordAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = recordDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid record.");
  }

  await assertRecordOwnership(userId, parsed.data.id);

  await prisma.cadetRecord.delete({
    where: {
      id: parsed.data.id,
    },
  });

  revalidateOperationalPages();
  return success("Record deleted.");
}
