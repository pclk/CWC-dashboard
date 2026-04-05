"use server";

import { failure, parseOptionalString, revalidateOperationalPages, success, type ActionResult } from "@/actions/helpers";
import { parseSingaporeDateInputToUtc } from "@/lib/date";
import { assertDutyInstructorOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dutyInstructorDeleteSchema, dutyInstructorSchema } from "@/lib/validators/duty-instructor";

export async function upsertDutyInstructorAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = dutyInstructorSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    dutyDate: parseOptionalString(formData.get("dutyDate")),
    rank: parseOptionalString(formData.get("rank")),
    name: parseOptionalString(formData.get("name")),
    reserve: parseOptionalString(formData.get("reserve")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid duty instructor entry.");
  }

  let dutyDate: Date | null;

  try {
    dutyDate = parseSingaporeDateInputToUtc(parsed.data.dutyDate);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Invalid duty date.");
  }

  if (!dutyDate) {
    return failure("Duty date is required.");
  }

  const data = {
    dutyDate,
    rank: parsed.data.rank,
    name: parsed.data.name,
    reserve: parsed.data.reserve || null,
  };

  try {
    if (parsed.data.id) {
      await assertDutyInstructorOwnership(userId, parsed.data.id);
      await prisma.dutyInstructor.update({
        where: { id: parsed.data.id },
        data,
      });
    } else {
      await prisma.dutyInstructor.create({
        data: {
          userId,
          ...data,
        },
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      (error as { code?: string }).code === "P2002"
    ) {
      return failure("A duty instructor entry already exists for that date.");
    }

    throw error;
  }

  revalidateOperationalPages();
  return success(parsed.data.id ? "Duty instructor updated." : "Duty instructor created.");
}

export async function deleteDutyInstructorAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = dutyInstructorDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid duty instructor entry.");
  }

  await assertDutyInstructorOwnership(userId, parsed.data.id);
  await prisma.dutyInstructor.delete({
    where: { id: parsed.data.id },
  });

  revalidateOperationalPages();
  return success("Duty instructor deleted.");
}
