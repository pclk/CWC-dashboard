import { z } from "zod";

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const setupSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional().or(z.literal("")),
    email: emailSchema,
    password: z.string().min(12, "Password must be at least 12 characters."),
    confirmPassword: z.string().min(12),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
