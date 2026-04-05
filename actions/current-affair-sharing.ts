"use server";

import { CurrentAffairScope } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { failure, parseNumber, parseOptionalString, success, type ActionResult } from "@/actions/helpers";
import { parseSingaporeDateInputToUtc } from "@/lib/date";
import { assertCurrentAffairSharingOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  currentAffairSharingDeleteSchema,
  currentAffairSharingSchema,
} from "@/lib/validators/current-affair-sharing";

function revalidateCurrentAffairViews() {
  revalidatePath("/dashboard");
  revalidatePath("/announcements");
}

export async function upsertCurrentAffairSharingAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = currentAffairSharingSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    sharingDate: parseOptionalString(formData.get("sharingDate")),
    scope: parseOptionalString(formData.get("scope")),
    presenter: parseOptionalString(formData.get("presenter")),
    title: parseOptionalString(formData.get("title")),
    sortOrder: parseNumber(formData.get("sortOrder")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid current affair sharing entry.");
  }

  let sharingDate: Date | null;

  try {
    sharingDate = parseSingaporeDateInputToUtc(parsed.data.sharingDate);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Invalid date.");
  }

  if (!sharingDate) {
    return failure("Date is required.");
  }

  const data = {
    sharingDate,
    scope: parsed.data.scope as CurrentAffairScope,
    presenter: parsed.data.presenter,
    title: parsed.data.title,
    sortOrder: parsed.data.sortOrder,
  };

  if (parsed.data.id) {
    await assertCurrentAffairSharingOwnership(userId, parsed.data.id);
    await prisma.currentAffairSharing.update({
      where: { id: parsed.data.id },
      data,
    });
  } else {
    await prisma.currentAffairSharing.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  revalidateCurrentAffairViews();
  return success(parsed.data.id ? "Current affair sharing updated." : "Current affair sharing created.");
}

export async function deleteCurrentAffairSharingAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = currentAffairSharingDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid current affair sharing entry.");
  }

  await assertCurrentAffairSharingOwnership(userId, parsed.data.id);
  await prisma.currentAffairSharing.delete({
    where: { id: parsed.data.id },
  });

  revalidateCurrentAffairViews();
  return success("Current affair sharing deleted.");
}
