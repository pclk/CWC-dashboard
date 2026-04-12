import { z } from "zod";

import { NIGHT_STUDY_MODES } from "@/lib/night-study";

export const nightStudyDraftSchema = z.object({
  mode: z.enum(NIGHT_STUDY_MODES),
  primaryNamesText: z.string().trim().max(4000),
  earlyPartyNamesText: z.string().trim().max(4000),
});
