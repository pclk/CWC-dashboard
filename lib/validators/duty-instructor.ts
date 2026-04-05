import { z } from "zod";

export const dutyInstructorSchema = z.object({
  id: z.string().optional(),
  dutyDate: z.string().trim().min(1).max(40),
  rank: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  reserve: z.string().trim().max(160).optional().or(z.literal("")),
});

export const dutyInstructorDeleteSchema = z.object({
  id: z.string().min(1),
});
