import { z } from "zod";

export const troopMovementSchema = z.object({
  fromLocation: z.string().trim().min(1).max(120),
  toLocation: z.string().trim().min(1).max(120),
  strengthText: z.string().trim().min(1).max(40),
  arrivalTimeText: z.string().trim().min(1).max(20),
  remarks: z.array(z.string().trim().max(1000)).default([]),
  finalMessage: z.string().trim().min(1),
});

export const troopMovementDeleteSchema = z.object({
  id: z.string().min(1),
});
