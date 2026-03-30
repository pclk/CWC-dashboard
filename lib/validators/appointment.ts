import { z } from "zod";

export const appointmentSchema = z.object({
  id: z.string().optional(),
  cadetId: z.string().min(1, "Cadet is required."),
  title: z.string().trim().min(1, "Title is required.").max(160),
  venue: z.string().trim().max(160).optional().or(z.literal("")),
  appointmentAt: z.string().min(1, "Appointment time is required."),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  completed: z.boolean(),
});

export const appointmentDeleteSchema = z.object({
  id: z.string().min(1),
});
