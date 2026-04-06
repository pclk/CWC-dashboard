"use server";

import { z } from "zod";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { buildParadeStateInput, getUserTemplateMap, saveParadeStateSnapshot } from "@/lib/db";
import { parseSingaporeInputToUtc } from "@/lib/date";
import { generateParadeStateMessage } from "@/lib/generators/parade-state";
import { assertSnapshotOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { paradeDraftSchema } from "@/lib/validators/generator-drafts";
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

const previewParadeStateSchema = paradeDraftSchema;

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

export async function previewParadeStateAction(
  input: z.input<typeof previewParadeStateSchema>,
): Promise<
  | {
      ok: true;
      generatedText: string;
      totalStrength: number;
      presentStrength: number;
      maOaAppointmentCount: number;
      upcomingAppointmentCount: number;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const userId = await requireUser();
  const parsed = previewParadeStateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid parade preview payload.",
    };
  }

  let reportAt: Date;

  try {
    reportAt = parseSingaporeInputToUtc(parsed.data.reportAtValue) ?? new Date();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid parade report date and time.",
    };
  }

  const [inputData, templateMap] = await Promise.all([
    buildParadeStateInput(userId, {
      reportType: parsed.data.reportType,
      reportAt,
      reportTimeLabel: parsed.data.reportTimeLabel,
      prefixOverride: parsed.data.prefixOverride,
    }),
    getUserTemplateMap(userId),
  ]);

  return {
    ok: true,
    generatedText: generateParadeStateMessage(inputData, templateMap.PARADE_MORNING),
    totalStrength: inputData.totalStrength,
    presentStrength: inputData.presentStrength,
    maOaAppointmentCount: inputData.maOaAppointments.length,
    upcomingAppointmentCount: inputData.upcomingAppointments.length,
  };
}
