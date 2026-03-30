import { z } from "zod";

export const cadetSchema = z.object({
  id: z.string().optional(),
  rank: z.string().trim().min(1).max(32),
  displayName: z.string().trim().min(1).max(120),
  serviceNumber: z.string().trim().max(64).optional().or(z.literal("")),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const cadetDeleteSchema = z.object({
  id: z.string().min(1),
});
