import { CetActivityType, CetVisibility } from "@prisma/client";
import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const trimmedName = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

const optionalMultiline = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const isoDateString = z
  .string()
  .trim()
  .min(1, "Date is required.")
  .regex(ISO_DATE_REGEX, "Date must be YYYY-MM-DD.");

const hhmmString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .regex(HHMM_REGEX, `${label} must be HH:mm.`);

const optionalCuid = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal(""));

export const cetVenueUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  name: trimmedName(80, "Venue name"),
});

export const cetVenueDeleteSchema = z.object({
  venueId: z.string().min(1, "Venue is required."),
});

export const cetAttireUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  name: trimmedName(80, "Attire name"),
});

export const cetAttireDeleteSchema = z.object({
  attireId: z.string().min(1, "Attire is required."),
});

export const cetDayBlockUpsertSchema = z
  .object({
    id: z.string().min(1).optional(),
    date: isoDateString,
    startTime: hhmmString("Start time"),
    endTime: hhmmString("End time"),
    title: trimmedName(160, "Title"),
    activityType: z.enum(CetActivityType),
    venueId: optionalCuid,
    createVenueName: z.string().trim().max(80).optional().or(z.literal("")),
    attireId: optionalCuid,
    createAttireName: z.string().trim().max(80).optional().or(z.literal("")),
    requiredItems: optionalMultiline(2000),
    remarks: optionalMultiline(2000),
    visibility: z.enum(CetVisibility),
    targetCadetIds: z.array(z.string().min(1)).default([]),
  })
  .superRefine((value, ctx) => {
    const [startHour, startMinute] = value.startTime.split(":").map(Number);
    const [endHour, endMinute] = value.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (endMinutes <= startMinutes) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time.",
      });
    }

    if (
      value.visibility === CetVisibility.SELECTED_CADETS &&
      value.targetCadetIds.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["targetCadetIds"],
        message: "Select at least one cadet for this CET block.",
      });
    }
  });

export const cetDayBlockDeleteSchema = z.object({
  blockId: z.string().min(1, "Block is required."),
});

export const cetTemplateUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  name: trimmedName(120, "Template name"),
});

export const cetTemplateDeleteSchema = z.object({
  templateId: z.string().min(1, "Template is required."),
});

export const cetTemplateBlockUpsertSchema = z
  .object({
    id: z.string().min(1).optional(),
    templateId: z.string().min(1, "Template is required."),
    startTime: hhmmString("Start time"),
    endTime: hhmmString("End time"),
    title: trimmedName(160, "Title"),
    activityType: z.enum(CetActivityType),
    venueId: optionalCuid,
    createVenueName: z.string().trim().max(80).optional().or(z.literal("")),
    attireId: optionalCuid,
    createAttireName: z.string().trim().max(80).optional().or(z.literal("")),
    requiredItems: optionalMultiline(2000),
    remarks: optionalMultiline(2000),
    visibility: z.enum(CetVisibility).default(CetVisibility.COHORT),
  })
  .superRefine((value, ctx) => {
    const [startHour, startMinute] = value.startTime.split(":").map(Number);
    const [endHour, endMinute] = value.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (endMinutes <= startMinutes) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time.",
      });
    }
  });

export const cetTemplateBlockDeleteSchema = z.object({
  blockId: z.string().min(1, "Block is required."),
});

export const cetTemplateApplyMode = z.enum(["REPLACE", "APPEND"]);
export type CetTemplateApplyMode = z.infer<typeof cetTemplateApplyMode>;

export const cetApplyTemplateSchema = z.object({
  templateId: z.string().min(1, "Template is required."),
  date: isoDateString,
  mode: cetTemplateApplyMode,
});

export const cetSaveDayAsTemplateSchema = z.object({
  date: isoDateString,
  templateName: trimmedName(120, "Template name"),
});

export type CetVenueUpsertInput = z.infer<typeof cetVenueUpsertSchema>;
export type CetVenueDeleteInput = z.infer<typeof cetVenueDeleteSchema>;
export type CetAttireUpsertInput = z.infer<typeof cetAttireUpsertSchema>;
export type CetAttireDeleteInput = z.infer<typeof cetAttireDeleteSchema>;
export type CetDayBlockUpsertInput = z.infer<typeof cetDayBlockUpsertSchema>;
export type CetDayBlockDeleteInput = z.infer<typeof cetDayBlockDeleteSchema>;
export type CetTemplateUpsertInput = z.infer<typeof cetTemplateUpsertSchema>;
export type CetTemplateDeleteInput = z.infer<typeof cetTemplateDeleteSchema>;
export type CetTemplateBlockUpsertInput = z.infer<typeof cetTemplateBlockUpsertSchema>;
export type CetTemplateBlockDeleteInput = z.infer<typeof cetTemplateBlockDeleteSchema>;
export type CetApplyTemplateInput = z.infer<typeof cetApplyTemplateSchema>;
export type CetSaveDayAsTemplateInput = z.infer<typeof cetSaveDayAsTemplateSchema>;
