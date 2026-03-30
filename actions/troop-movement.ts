"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { createTroopMovement } from "@/lib/db";
import { assertTroopMovementOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { troopMovementDeleteSchema, troopMovementSchema } from "@/lib/validators/movement";

export async function saveTroopMovementAction(
  input: z.input<typeof troopMovementSchema>,
): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = troopMovementSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid troop movement payload.");
  }

  await createTroopMovement(userId, {
    fromLocation: parsed.data.fromLocation,
    toLocation: parsed.data.toLocation,
    strengthText: parsed.data.strengthText,
    arrivalTimeText: parsed.data.arrivalTimeText,
    remarks: parsed.data.remarks.join("\n"),
    finalMessage: parsed.data.finalMessage,
  });

  revalidatePath("/troop-movement");
  return success("Troop movement saved.");
}

export async function deleteTroopMovementAction(
  input: z.input<typeof troopMovementDeleteSchema>,
): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = troopMovementDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return failure("Invalid troop movement.");
  }

  await assertTroopMovementOwnership(userId, parsed.data.id);

  await prisma.troopMovement.delete({
    where: {
      id: parsed.data.id,
    },
  });

  revalidatePath("/troop-movement");
  return success("Troop movement deleted.");
}
