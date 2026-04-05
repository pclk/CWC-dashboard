import { z } from "zod";

export const announcementDraftTypeSchema = z.enum([
  "MTR_1030",
  "MTR_1630",
  "LAST_PARADE_1730",
]);

export const announcementDraftSchema = z.object({
  type: announcementDraftTypeSchema,
  time: z.string().trim().max(40),
  location: z.string().trim().max(160),
});

export const paradeDraftSchema = z.object({
  reportType: z.enum(["Morning", "Night", "Custom"]),
  reportAtValue: z.string().trim().max(40),
  reportTimeLabel: z.string().trim().max(120),
  prefixOverride: z.string().trim().max(500),
});

export const troopMovementDraftSchema = z.object({
  fromLocation: z.string().trim().max(120),
  toLocation: z.string().trim().max(120),
  strengthText: z.string().trim().max(120),
  arrivalTimeText: z.string().trim().max(40),
  remarksText: z.string().trim().max(4000),
});
