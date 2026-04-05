import { z } from "zod";

import { RECORD_CATEGORY_VALUES } from "@/lib/record-categories";

export const recordSchema = z.object({
  id: z.string().optional(),
  cadetId: z.string().min(1, "Cadet is required."),
  category: z.enum(RECORD_CATEGORY_VALUES),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
  startAt: z.string().optional().or(z.literal("")),
  endAt: z.string().optional().or(z.literal("")),
  unknownEndTime: z.boolean(),
  affectsStrength: z.boolean(),
  countsNotInCamp: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const recordResolveSchema = z.object({
  id: z.string().min(1),
});

export const recordDeleteSchema = z.object({
  id: z.string().min(1),
});
