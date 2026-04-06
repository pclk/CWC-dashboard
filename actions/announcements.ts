"use server";

import { TemplateType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { messageTemplateSchema } from "@/lib/validators/template";

const supportedAnnouncementTypes = new Set<TemplateType>([
  TemplateType.MTR_1030,
  TemplateType.MTR_1630,
  TemplateType.LAST_PARADE_1730,
  TemplateType.MORNING_LAB,
  TemplateType.FIRST_PARADE,
  TemplateType.PT,
  TemplateType.CURRENT_AFFAIR_SHARING,
  TemplateType.CURRENT_AFFAIR_REMINDER,
  TemplateType.REQUEST_DI_FP,
  TemplateType.REQUEST_LP,
]);

export async function updateAnnouncementTemplateAction(
  input: { type: TemplateType; body: string },
): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = messageTemplateSchema.safeParse(input);

  if (!parsed.success || !supportedAnnouncementTypes.has(parsed.data.type)) {
    return failure("Invalid announcement template.");
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

  revalidatePath("/dashboard");
  revalidatePath("/announcements");
  revalidatePath("/settings");
  return success("Announcement template updated.");
}
