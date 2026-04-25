import { z } from "zod";

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

export const setupSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
    email: emailSchema,
    password: z.string(),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const adminChangePasswordSchema = z
  .object({
    email: emailSchema,
    adminPassword: z.string().min(1, "Admin password is required."),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const adminDashboardLoginSchema = z.object({
  email: emailSchema,
  adminPassword: z.string().min(1, "Admin password is required."),
});
