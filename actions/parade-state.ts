"use server";

import { z } from "zod";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { saveParadeStateSnapshot } from "@/lib/db";
import { assertSnapshotOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

const saveSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(40),
  reportedAt: z.coerce.date(),
  totalStrength: z.number().int().min(0),
  presentStrength: z.number().int().min(0),
  finalMessage: z.string().trim().min(1),
});

const deleteSnapshotSchema = z.object({
  id: z.string().min(1),
});

export async function saveParadeStateSnapshotAction(
  input: z.input<typeof saveSnapshotSchema>,
): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = saveSnapshotSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid snapshot payload.");
  }

  await saveParadeStateSnapshot(userId, parsed.data);
  revalidatePath("/parade-state");
  return success("Snapshot saved.");
}

export async function deleteParadeStateSnapshotAction(
  input: z.input<typeof deleteSnapshotSchema>,
): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = deleteSnapshotSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid snapshot.");
  }

  await assertSnapshotOwnership(userId, parsed.data.id);

  await prisma.paradeStateSnapshot.delete({
    where: {
      id: parsed.data.id,
    },
  });

  revalidatePath("/parade-state");
  return success("Snapshot deleted.");
}
