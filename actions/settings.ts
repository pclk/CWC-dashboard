"use server";

import { TemplateType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";
import { messageTemplateSchema, userSettingsSchema } from "@/lib/validators/template";

function resolveSynchronizedTemplateTypes(type: TemplateType) {
  if (type === TemplateType.PARADE_MORNING || type === TemplateType.PARADE_NIGHT) {
    return [TemplateType.PARADE_MORNING, TemplateType.PARADE_NIGHT];
  }

  return [type];
}

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
  revalidatePath("/current-affairs");
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

  const synchronizedTypes = resolveSynchronizedTemplateTypes(parsed.data.type);

  await prisma.messageTemplate.updateMany({
    where: {
      userId,
      type: {
        in: synchronizedTypes,
      },
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
  revalidatePath("/current-affairs");
  revalidatePath("/book-in");
  return success("Template updated.");
}

export async function resetMessageTemplateAction(
  input: { type: TemplateType },
): Promise<ActionResult> {
  const userId = await requireUser();

  if (!(input.type in DEFAULT_TEMPLATE_BODIES)) {
    return failure("Invalid template type.");
  }

  const body = DEFAULT_TEMPLATE_BODIES[input.type];
  const synchronizedTypes = resolveSynchronizedTemplateTypes(input.type);

  await prisma.messageTemplate.updateMany({
    where: {
      userId,
      type: {
        in: synchronizedTypes,
      },
      isDefault: true,
    },
    data: {
      body,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/parade-state");
  revalidatePath("/troop-movement");
  revalidatePath("/announcements");
  revalidatePath("/current-affairs");
  revalidatePath("/book-in");
  return success("Template reset to default.");
}
