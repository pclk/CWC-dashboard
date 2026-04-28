import { z } from "zod";

import { NIGHT_STUDY_MODES } from "@/lib/night-study";

export const nightStudyDraftSchema = z.object({
  mode: z.enum(NIGHT_STUDY_MODES),
  primaryNamesText: z.string().trim().max(4000),
  earlyPartyNamesText: z.string().trim().max(4000),
  otherNamesText: z.string().trim().max(4000),
});

export const CADET_NIGHT_STUDY_CHOICE_VALUES = [
  "NIGHT_STUDY",
  "EARLY_PARTY",
  "GO_BACK_BUNK",
] as const;

export type CadetNightStudyChoiceValue = (typeof CADET_NIGHT_STUDY_CHOICE_VALUES)[number];

export const cadetNightStudyChoiceSchema = z.object({
  choice: z.enum(CADET_NIGHT_STUDY_CHOICE_VALUES),
});

export type CadetNightStudyChoiceInput = z.input<typeof cadetNightStudyChoiceSchema>;
