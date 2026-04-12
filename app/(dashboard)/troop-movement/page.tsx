import { MovementPreview } from "@/components/generators/movement-preview";
import { buildNightStudyRemarkSuggestions } from "@/lib/night-study";
import {
  buildNightStudyContext,
  buildTroopMovementContext,
  getSettingsAndTemplates,
  getTroopMovements,
} from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function TroopMovementPage() {
  const userId = await requireUser();
  const [context, settingsBundle, history, nightStudyContext] = await Promise.all([
    buildTroopMovementContext(userId),
    getSettingsAndTemplates(userId),
    getTroopMovements(userId),
    buildNightStudyContext(userId),
  ]);

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
      nightStudyRemarkSuggestions={
        nightStudyContext.resolved.errors.length
          ? []
          : buildNightStudyRemarkSuggestions(nightStudyContext.resolved)
      }
      nightStudyErrors={nightStudyContext.resolved.errors}
      history={history}
    />
  );
}
