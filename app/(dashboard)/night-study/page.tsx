import { NightStudyManager } from "@/components/night-study/night-study-manager";
import { buildNightStudyContext } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function NightStudyPage() {
  const userId = await requireUser();
  const context = await buildNightStudyContext(userId);

  return (
    <NightStudyManager
      activeCadets={context.activeCadets}
      initialMode={context.mode}
      initialPrimaryNamesText={context.primaryNamesText}
      initialEarlyPartyNamesText={context.earlyPartyNamesText}
    />
  );
}
