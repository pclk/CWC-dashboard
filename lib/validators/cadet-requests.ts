import { z } from "zod";

import { RECORD_CATEGORY_VALUES } from "@/lib/record-categories";

const optionalString = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date." });
      return z.NEVER;
    }
    return date;
  });

export const reportSickRequestSchema = z
  .object({
    category: z.enum(RECORD_CATEGORY_VALUES),
    title: optionalString(200),
    details: optionalString(2000),
    startAt: optionalDate,
    endAt: optionalDate,
    unknownEndTime: z.boolean().optional().default(false),
    affectsStrength: z.boolean().optional().default(true),
    countsNotInCamp: z.boolean().optional().default(false),
  })
  .refine(
    (value) =>
      !value.startAt || !value.endAt || value.endAt.getTime() >= value.startAt.getTime(),
    { path: ["endAt"], message: "End time must be after start time." },
  );

export const mcStatusUpdateRequestSchema = reportSickRequestSchema;

export const declineRequestSchema = z.object({
  requestId: z.string().trim().min(1, "Request is required."),
  reason: z.string().trim().min(1, "Reason is required.").max(1000),
});

export const approveRequestSchema = z.object({
  requestId: z.string().trim().min(1, "Request is required."),
});

export const cwcApproveRequestSchema = z.object({
  requestId: z.string().trim().min(1, "Request is required."),
  targetRecordId: z.string().trim().min(1).optional(),
  editedRecord: z
    .object({
      category: z.enum(RECORD_CATEGORY_VALUES).optional(),
      title: optionalString(200),
      details: optionalString(2000),
      startAt: optionalDate,
      endAt: optionalDate,
      unknownEndTime: z.boolean().optional(),
      affectsStrength: z.boolean().optional(),
      countsNotInCamp: z.boolean().optional(),
    })
    .optional(),
});

export type ReportSickRequestInput = z.input<typeof reportSickRequestSchema>;
export type McStatusUpdateRequestInput = z.input<typeof mcStatusUpdateRequestSchema>;
export type CwcApproveRequestInput = z.input<typeof cwcApproveRequestSchema>;
