export const RECORD_CATEGORY_VALUES = [
  "MC",
  "RSO",
  "RSI",
  "CL",
  "HL",
  "OTHER",
  "STATUS_RESTRICTION",
] as const;

export type AppRecordCategory = (typeof RECORD_CATEGORY_VALUES)[number];

const RECORD_CATEGORY_LABELS: Record<AppRecordCategory, string> = {
  MC: "MC",
  RSO: "RSO",
  RSI: "RSI",
  CL: "CL",
  HL: "HL",
  OTHER: "OTHER",
  STATUS_RESTRICTION: "STATUS",
};

export function getRecordCategoryLabel(category: AppRecordCategory | string) {
  if (category === "STATUS_RESTRICTION") {
    return "STATUS";
  }

  return RECORD_CATEGORY_LABELS[category as AppRecordCategory] ?? category;
}
