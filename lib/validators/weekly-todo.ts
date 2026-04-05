import { z } from "zod";

export const weeklyTodoCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const weeklyTodoToggleSchema = z.object({
  id: z.string().min(1),
  completed: z.boolean(),
});

export const weeklyTodoDeleteSchema = z.object({
  id: z.string().min(1),
});
