"use server";

import { assertCadetOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cadetDeleteSchema, cadetSchema } from "@/lib/validators/cadet";
import { failure, parseCheckbox, parseNumber, parseOptionalString, revalidateOperationalPages, success, type ActionResult } from "@/actions/helpers";

export async function upsertCadetAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = cadetSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    rank: parseOptionalString(formData.get("rank")),
    displayName: parseOptionalString(formData.get("displayName")),
    serviceNumber: parseOptionalString(formData.get("serviceNumber")),
    active: parseCheckbox(formData.get("active")),
    sortOrder: parseNumber(formData.get("sortOrder")),
    notes: parseOptionalString(formData.get("notes")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid cadet payload.");
  }

  if (parsed.data.id) {
    await assertCadetOwnership(userId, parsed.data.id);

    await prisma.cadet.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        rank: parsed.data.rank,
        displayName: parsed.data.displayName,
        serviceNumber: parsed.data.serviceNumber || null,
        active: parsed.data.active,
        sortOrder: parsed.data.sortOrder,
        notes: parsed.data.notes || null,
      },
    });
  } else {
    await prisma.cadet.create({
      data: {
        userId,
        rank: parsed.data.rank,
        displayName: parsed.data.displayName,
        serviceNumber: parsed.data.serviceNumber || null,
        active: parsed.data.active,
        sortOrder: parsed.data.sortOrder,
        notes: parsed.data.notes || null,
      },
    });
  }

  revalidateOperationalPages();
  return success(parsed.data.id ? "Cadet updated." : "Cadet created.");
}

export async function deleteCadetAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = cadetDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid cadet.");
  }

  await assertCadetOwnership(userId, parsed.data.id);

  await prisma.cadet.delete({
    where: {
      id: parsed.data.id,
    },
  });

  revalidateOperationalPages();
  return success("Cadet deleted.");
}
