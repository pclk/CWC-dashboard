import { NightStudyManager } from "@/components/night-study/night-study-manager";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { buildNightStudyContext } from "@/lib/db";
import { prepareNightStudyInitialSync } from "@/lib/night-study-sync";
import { requireUser } from "@/lib/session";

export default async function NightStudyPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const initialSyncState = await prepareNightStudyInitialSync(userId);
    const context = await buildNightStudyContext(userId);

    return (
      <NightStudyManager
        activeCadets={context.activeCadets}
        automaticOthersNames={context.automaticOthersNames}
        initialMode={context.mode}
        initialPrimaryNamesText={context.primaryNamesText}
        initialEarlyPartyNamesText={context.earlyPartyNamesText}
        initialOtherNamesText={context.otherNamesText}
        initialAutoSyncSummary={initialSyncState.autoSyncSummary}
        initialCadetChoicesAvailableSummary={initialSyncState.cadetChoicesAvailableSummary}
        initialAutoSyncError={initialSyncState.autoSyncError}
      />
    );
  });
}
