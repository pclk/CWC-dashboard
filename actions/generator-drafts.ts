"use server";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { ensureUserConfiguration } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  announcementDraftSchema,
  paradeDraftSchema,
  troopMovementDraftSchema,
} from "@/lib/validators/generator-drafts";

export async function updateAnnouncementDraftAction(input: {
  type: "MTR_1030" | "MTR_1630" | "LAST_PARADE_1730";
  time: string;
  location: string;
}): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = announcementDraftSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid announcement draft.");
  }

  await ensureUserConfiguration(userId);

  const data =
    parsed.data.type === "MTR_1030"
      ? {
          announcementMtr1030Time: parsed.data.time,
          announcementMtr1030Location: parsed.data.location,
        }
      : parsed.data.type === "MTR_1630"
        ? {
            announcementMtr1630Time: parsed.data.time,
            announcementMtr1630Location: parsed.data.location,
          }
        : {
            announcementLastParadeTime: parsed.data.time,
            announcementLastParadeLocation: parsed.data.location,
          };

  await prisma.userSettings.update({
    where: { userId },
    data,
  });

  return success("Announcement draft saved.");
}

export async function updateParadeDraftAction(input: {
  reportType: "Morning" | "Night" | "Custom";
  reportAtValue: string;
  reportTimeLabel: string;
  prefixOverride: string;
}): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = paradeDraftSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid parade draft.");
  }

  await ensureUserConfiguration(userId);

  await prisma.userSettings.update({
    where: { userId },
    data: {
      paradeDraftReportType: parsed.data.reportType,
      paradeDraftReportAtValue: parsed.data.reportAtValue,
      paradeDraftReportTimeLabel: parsed.data.reportTimeLabel,
      paradeDraftPrefixOverride: parsed.data.prefixOverride,
    },
  });

  return success("Parade draft saved.");
}

export async function updateTroopMovementDraftAction(input: {
  fromLocation: string;
  toLocation: string;
  strengthText: string;
  arrivalTimeText: string;
  remarksText: string;
}): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = troopMovementDraftSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid movement draft.");
  }

  await ensureUserConfiguration(userId);

  await prisma.userSettings.update({
    where: { userId },
    data: {
      movementDraftFromLocation: parsed.data.fromLocation,
      movementDraftToLocation: parsed.data.toLocation,
      movementDraftStrengthText: parsed.data.strengthText,
      movementDraftArrivalTimeText: parsed.data.arrivalTimeText,
      movementDraftRemarksText: parsed.data.remarksText,
    },
  });

  return success("Movement draft saved.");
}
