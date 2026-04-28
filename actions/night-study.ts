"use server";

import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { ensureUserConfiguration, getNightStudyCadetGroups } from "@/lib/db";
import { resolveNightStudyAssignments } from "@/lib/night-study";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { nightStudyDraftSchema } from "@/lib/validators/night-study";

export async function updateNightStudyDraftAction(input: {
  mode: "NIGHT_STUDY" | "GO_BACK_BUNK";
  primaryNamesText: string;
  earlyPartyNamesText: string;
  otherNamesText: string;
}): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = nightStudyDraftSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid night study payload.");
  }

  await ensureUserConfiguration(userId);

  const cadetGroups = await getNightStudyCadetGroups(userId);
  const resolved = resolveNightStudyAssignments({
    mode: parsed.data.mode,
    primaryNamesText: parsed.data.primaryNamesText,
    earlyPartyNamesText: parsed.data.earlyPartyNamesText,
    otherNamesText: parsed.data.otherNamesText,
    activeCadets: cadetGroups.activeCadets,
    automaticOthersNames: cadetGroups.automaticOthersNames,
  });

  if (resolved.errors.length) {
    return failure(resolved.errors.join(" "));
  }

  await prisma.userSettings.update({
    where: { userId },
    data: {
      nightStudyDraftMode: parsed.data.mode,
      nightStudyPrimaryNamesText: resolved.primaryNames.length
        ? resolved.primaryNames.join("\n")
        : null,
      nightStudyEarlyPartyNamesText: resolved.earlyPartyNames.length
        ? resolved.earlyPartyNames.join("\n")
        : null,
      nightStudyOtherNamesText: resolved.otherNamesText,
    },
  });

  revalidatePath("/cwc/night-study");
  revalidatePath("/cwc/troop-movement");
  return success("Night study groups saved.");
}
