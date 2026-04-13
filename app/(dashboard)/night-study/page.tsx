import { NightStudyManager } from "@/components/night-study/night-study-manager";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { buildNightStudyContext } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function NightStudyPage() {
  return renderWithDatabaseWakeupFallback(async () => {
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
  });
}
