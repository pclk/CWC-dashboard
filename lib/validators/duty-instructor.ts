import { z } from "zod";

export const dutyInstructorModeSchema = z.enum(["text", "form"]);

export const dutyInstructorSchema = z.object({
  id: z.string().optional(),
  mode: dutyInstructorModeSchema,
  entryText: z.string().trim().max(4000).optional().or(z.literal("")),
  dutyDate: z.string().trim().max(40).optional().or(z.literal("")),
  active: z.string().trim().max(160).optional().or(z.literal("")),
  reserve: z.string().trim().max(160).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.mode === "text") {
    if (!value.entryText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter at least one duty instructor line.",
        path: ["entryText"],
      });
    }

    return;
  }

  if (!value.dutyDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duty date is required.",
      path: ["dutyDate"],
    });
  }

  if (!value.active) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Active is required.",
      path: ["active"],
    });
  }
});

export const dutyInstructorDeleteSchema = z.object({
  id: z.string().min(1),
});
