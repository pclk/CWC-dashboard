"use server";

import { Prisma } from "@prisma/client";

import {
  failure,
  parseNumber,
  parseOptionalString,
  revalidateOperationalPages,
  success,
  type ActionResult,
} from "@/actions/helpers";
import { assertBunkOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { bunkDeleteSchema, bunkSchema } from "@/lib/validators/bunk";

function parsePersonnelLines(personnelText: string) {
  return personnelText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function upsertBunkAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = bunkSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    bunkNumber: parseNumber(formData.get("bunkNumber")),
    bunkId: parseOptionalString(formData.get("bunkId")),
    personnelText: parseOptionalString(formData.get("personnelText")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid bunk entry.");
  }

  const personnel = parsePersonnelLines(parsed.data.personnelText);

  if (!personnel.length) {
    return failure("Add at least one person to the bunk.");
  }

  try {
    if (parsed.data.id) {
      await assertBunkOwnership(userId, parsed.data.id);

      await prisma.bunk.update({
        where: { id: parsed.data.id },
        data: {
          bunkNumber: parsed.data.bunkNumber,
          bunkId: parsed.data.bunkId,
          personnel,
        },
      });
    } else {
      await prisma.bunk.create({
        data: {
          userId,
          bunkNumber: parsed.data.bunkNumber,
          bunkId: parsed.data.bunkId,
          personnel,
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
      return failure("A bunk with that number already exists.");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return failure("Bunk entry not found.");
    }

    throw error;
  }

  revalidateOperationalPages();
  return success(parsed.data.id ? "Bunk updated." : "Bunk created.");
}

export async function deleteBunkAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = bunkDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid bunk entry.");
  }

  await assertBunkOwnership(userId, parsed.data.id);
  await prisma.bunk.delete({
    where: { id: parsed.data.id },
  });

  revalidateOperationalPages();
  return success("Bunk deleted.");
}
