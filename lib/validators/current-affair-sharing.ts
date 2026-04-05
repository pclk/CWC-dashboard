import { z } from "zod";

export const currentAffairScopeSchema = z.enum(["LOCAL", "OVERSEAS"]);

export const currentAffairSharingSchema = z.object({
  id: z.string().optional(),
  sharingDate: z.string().trim().min(1).max(40),
  scope: currentAffairScopeSchema,
  presenter: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(500),
  sortOrder: z.number().int().min(0).max(9999),
});

export const currentAffairSharingDeleteSchema = z.object({
  id: z.string().min(1),
});
