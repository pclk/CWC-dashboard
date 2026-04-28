import { z } from "zod";

export const batchNameSchema = z.string().trim().min(2).max(80);

export const loginSchema = z.object({
  cadetIdentifier: z.string().trim().min(1, "Cadet name or shorthand is required.").max(80),
  password: z.string(),
});

export const cadetLoginSchema = loginSchema;

export const setupSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
    batchName: batchNameSchema,
    password: z.string(),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const adminLoginSchema = z.object({
  adminPassword: z.string().min(1, "Admin password is required."),
});

export const adminChangeInstructorPasswordSchema = z
  .object({
    newPassword: z.string().min(1, "New password is required."),
    confirmPassword: z.string().min(1, "Confirm password is required."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const instructorDashboardLoginSchema = z.object({
  batchName: batchNameSchema,
  instructorPassword: z.string().min(1, "Instructor password is required."),
});

export const instructorChangeBatchNameSchema = z.object({
  batchName: batchNameSchema,
});
