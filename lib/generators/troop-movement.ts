import { renderTemplate } from "@/lib/formatting";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";

export const DEFAULT_TROOP_MOVEMENT_LOCATION_SUGGESTIONS = [
  "CSTH",
  "BUNK",
  "GUARDHOUSE",
  "REFUSE CENTRE",
  "MO",
  "CYTEC",
] as const;

export type TroopMovementInput = {
  unitName: string;
  fromLocation: string;
  toLocation: string;
  strengthText: string;
  arrivalTimeText: string;
  remarks: string[];
};

function renderRemarksBlock(remarks: string[]) {
  const cleaned = remarks.map((remark) => remark.trim()).filter(Boolean);

  if (!cleaned.length) {
    return "- NIL";
  }

  return cleaned.map((remark) => `- ${remark}`).join("\n");
}

export function generateTroopMovementMessage(
  input: TroopMovementInput,
  template = DEFAULT_TEMPLATE_BODIES.TROOP_MOVEMENT,
) {
  return renderTemplate(template, {
    unitName: input.unitName,
    fromLocation: input.fromLocation,
    toLocation: input.toLocation,
    strengthText: input.strengthText,
    arrivalTimeText: input.arrivalTimeText,
    remarksBlock: renderRemarksBlock(input.remarks),
  }).trim();
}
