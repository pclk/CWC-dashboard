import { z } from "zod";

import { ANNOUNCEMENT_DRAFT_TYPES } from "@/lib/announcement-config";

export const announcementDraftTypeSchema = z.enum(ANNOUNCEMENT_DRAFT_TYPES);

export const announcementDraftSchema = z.object({
  type: announcementDraftTypeSchema,
  time: z.string().trim().max(40),
  location: z.string().trim().max(160).optional().default(""),
  activity: z.string().trim().max(120).optional().default(""),
  recipient: z.string().trim().max(40).optional().default(""),
  name: z.string().trim().max(120).optional().default(""),
  firstTime: z.boolean().optional().default(false),
  isPtDay: z.boolean().optional().default(false),
});

export const paradeDraftSchema = z.object({
  reportType: z.enum(["Morning", "Night", "Custom"]),
  reportAtValue: z.string().trim().max(40),
});

export const troopMovementDraftSchema = z.object({
  fromLocation: z.string().trim().max(120),
  toLocation: z.string().trim().max(120),
  strengthText: z.string().trim().max(120),
  arrivalTimeText: z.string().trim().max(40),
  remarksText: z.string().trim().max(4000),
});

export const bunkDraftSchema = z.object({
  yesterdayLastBunkNumber: z.number().int().min(1).max(9999).nullable(),
  havePtToday: z.boolean(),
});
