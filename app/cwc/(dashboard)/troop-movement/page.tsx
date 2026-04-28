import { MovementPreview } from "@/components/generators/movement-preview";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import {
  buildNightStudyContext,
  buildTroopMovementContext,
  getSettingsAndTemplates,
  getTroopMovements,
} from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function TroopMovementPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const [context, settingsBundle, history, nightStudyContext] = await Promise.all([
      buildTroopMovementContext(userId),
      getSettingsAndTemplates(userId),
      getTroopMovements(userId),
      buildNightStudyContext(userId),
    ]);
    const nightStudyErrors = nightStudyContext.resolved.errors;
    const nightStudyRemarkSuggestions =
      nightStudyErrors.length || !nightStudyContext.resolved.nightStudyNames.length
        ? []
        : [{ group: "Night study", names: nightStudyContext.resolved.nightStudyNames }];
    const earlyPartyRemarkSuggestions =
      nightStudyErrors.length || !nightStudyContext.resolved.earlyPartyNames.length
        ? []
        : [{ group: "Early party", names: nightStudyContext.resolved.earlyPartyNames }];
    const goBackBunkRemarkSuggestions =
      nightStudyErrors.length || !nightStudyContext.resolved.goBackBunkNames.length
        ? []
        : [{ group: "Go back bunk", names: nightStudyContext.resolved.goBackBunkNames }];

    return (
      <MovementPreview
        unitName={context.unitName}
        templateBody={settingsBundle.templateMap.TROOP_MOVEMENT}
        suggestedStrengthText={context.suggestedStrengthText}
        totalStrength={context.totalStrength}
        remarkSuggestions={context.remarkSuggestions}
        activeCadets={context.activeCadets}
        initialFromLocation={settingsBundle.settings.movementDraftFromLocation}
        initialToLocation={settingsBundle.settings.movementDraftToLocation}
        initialStrengthText={settingsBundle.settings.movementDraftStrengthText}
        initialArrivalTimeText={settingsBundle.settings.movementDraftArrivalTimeText}
        initialRemarksText={settingsBundle.settings.movementDraftRemarksText}
        nightStudyRemarkSuggestions={nightStudyRemarkSuggestions}
        earlyPartyRemarkSuggestions={earlyPartyRemarkSuggestions}
        goBackBunkRemarkSuggestions={goBackBunkRemarkSuggestions}
        nightStudyErrors={nightStudyErrors}
        history={history}
      />
    );
  });
}
