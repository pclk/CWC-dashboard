import { TemplateType } from "@prisma/client";
import { z } from "zod";

export const userSettingsSchema = z.object({
  unitName: z.string().trim().min(1).max(120),
  defaultParadePrefix: z.string().trim().max(500).optional().or(z.literal("")),
  defaultNightPrefix: z.string().trim().max(500).optional().or(z.literal("")),
  defaultMtrMorningText: z.string().trim().max(500).optional().or(z.literal("")),
  defaultMtrAfternoonText: z.string().trim().max(500).optional().or(z.literal("")),
  defaultLastParadeText: z.string().trim().max(500).optional().or(z.literal("")),
});

export const messageTemplateSchema = z.object({
  type: z.enum(TemplateType),
  body: z.string().trim().min(1).max(10_000),
});
