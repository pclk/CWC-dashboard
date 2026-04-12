"use server";

import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { ensureUserConfiguration, getActiveCadets } from "@/lib/db";
import { resolveNightStudyAssignments } from "@/lib/night-study";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { nightStudyDraftSchema } from "@/lib/validators/night-study";

export async function updateNightStudyDraftAction(input: {
  mode: "NIGHT_STUDY" | "GO_BACK_BUNK";
  primaryNamesText: string;
  earlyPartyNamesText: string;
}): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = nightStudyDraftSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid night study payload.");
  }

  await ensureUserConfiguration(userId);

  const activeCadets = await getActiveCadets(userId);
  const resolved = resolveNightStudyAssignments({
    mode: parsed.data.mode,
    primaryNamesText: parsed.data.primaryNamesText,
    earlyPartyNamesText: parsed.data.earlyPartyNamesText,
    activeCadets: activeCadets.map((cadet) => ({
      rank: cadet.rank,
      displayName: cadet.displayName,
    })),
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
    },
  });

  revalidatePath("/night-study");
  revalidatePath("/troop-movement");
  return success("Night study groups saved.");
}
