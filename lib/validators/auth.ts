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

export const instructorRememberDurationSchema = z
  .enum(["1d", "7d", "30d"])
  .default("1d");

export type InstructorRememberDuration = z.infer<typeof instructorRememberDurationSchema>;

export const instructorDashboardLoginSchema = z.object({
  batchName: batchNameSchema,
  instructorPassword: z.string().min(1, "Instructor password is required."),
  rememberDuration: instructorRememberDurationSchema,
});

export const instructorChangeBatchNameSchema = z.object({
  batchName: batchNameSchema,
});

export const KAH_APPOINTMENT_HOLDER_VALUES = ["", "CWC"] as const;
export type KahAppointmentHolder = (typeof KAH_APPOINTMENT_HOLDER_VALUES)[number];

export const assignCadetAppointmentHolderSchema = z.object({
  cadetId: z.string().trim().min(1, "Cadet is required."),
  appointmentHolder: z.enum(KAH_APPOINTMENT_HOLDER_VALUES),
});

export const cadetResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
