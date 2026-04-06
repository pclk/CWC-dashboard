import { z } from "zod";

export const bunkSchema = z.object({
  id: z.string().optional(),
  bunkNumber: z.number().int().min(1).max(9999),
  bunkId: z.string().trim().min(1).max(120),
  personnelText: z.string().trim().min(1).max(4000),
});

export const bunkDeleteSchema = z.object({
  id: z.string().min(1),
});
