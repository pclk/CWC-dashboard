"use server";

import { TemplateType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { messageTemplateSchema, userSettingsSchema } from "@/lib/validators/template";

export async function updateUserSettingsAction(
  input: {
    unitName: string;
    defaultParadePrefix?: string;
    defaultNightPrefix?: string;
    defaultMtrMorningText?: string;
    defaultMtrAfternoonText?: string;
    defaultLastParadeText?: string;
  },
): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = userSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid settings payload.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.userSettings.upsert({
      where: { userId },
      update: {
        unitName: parsed.data.unitName,
        defaultParadePrefix: parsed.data.defaultParadePrefix || null,
        defaultNightPrefix: parsed.data.defaultNightPrefix || null,
        defaultMtrMorningText: parsed.data.defaultMtrMorningText || null,
        defaultMtrAfternoonText: parsed.data.defaultMtrAfternoonText || null,
        defaultLastParadeText: parsed.data.defaultLastParadeText || null,
      },
      create: {
        userId,
        unitName: parsed.data.unitName,
        defaultParadePrefix: parsed.data.defaultParadePrefix || null,
        defaultNightPrefix: parsed.data.defaultNightPrefix || null,
        defaultMtrMorningText: parsed.data.defaultMtrMorningText || null,
        defaultMtrAfternoonText: parsed.data.defaultMtrAfternoonText || null,
        defaultLastParadeText: parsed.data.defaultLastParadeText || null,
      },
    });

    if (parsed.data.defaultMtrMorningText) {
      await tx.messageTemplate.updateMany({
        where: {
          userId,
          type: TemplateType.MTR_1030,
          isDefault: true,
        },
        data: {
          body: parsed.data.defaultMtrMorningText,
        },
      });
    }

    if (parsed.data.defaultMtrAfternoonText) {
      await tx.messageTemplate.updateMany({
        where: {
          userId,
          type: TemplateType.MTR_1630,
          isDefault: true,
        },
        data: {
          body: parsed.data.defaultMtrAfternoonText,
        },
      });
    }

    if (parsed.data.defaultLastParadeText) {
      await tx.messageTemplate.updateMany({
        where: {
          userId,
          type: TemplateType.LAST_PARADE_1730,
          isDefault: true,
        },
        data: {
          body: parsed.data.defaultLastParadeText,
        },
      });
    }
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/parade-state");
  revalidatePath("/announcements");
  revalidatePath("/book-in");
  return success("Settings updated.");
}

export async function updateMessageTemplateAction(
  input: { type: TemplateType; body: string },
): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = messageTemplateSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid template payload.");
  }

  await prisma.messageTemplate.updateMany({
    where: {
      userId,
      type: parsed.data.type,
      isDefault: true,
    },
    data: {
      body: parsed.data.body,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/parade-state");
  revalidatePath("/troop-movement");
  revalidatePath("/announcements");
  revalidatePath("/book-in");
  return success("Template updated.");
}
