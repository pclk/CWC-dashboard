import { MovementPreview } from "@/components/generators/movement-preview";
import { buildTroopMovementContext, getSettingsAndTemplates, getTroopMovements } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function TroopMovementPage() {
  const userId = await requireUser();
  const [context, settingsBundle, history] = await Promise.all([
    buildTroopMovementContext(userId),
    getSettingsAndTemplates(userId),
    getTroopMovements(userId),
  ]);

  return (
    <MovementPreview
      unitName={context.unitName}
      templateBody={settingsBundle.templateMap.TROOP_MOVEMENT}
      suggestedStrengthText={context.suggestedStrengthText}
      remarkSuggestions={context.remarkSuggestions}
      history={history}
    />
  );
}
