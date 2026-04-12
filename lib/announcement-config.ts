export const ANNOUNCEMENT_DRAFT_TYPES = [
  "MTR_1030",
  "MTR_1630",
  "LAST_PARADE_1730",
  "MORNING_LAB",
  "FIRST_PARADE",
  "PT",
  "REQUEST_DI_FP",
  "REQUEST_LP",
] as const;

export type AnnouncementDraftType = (typeof ANNOUNCEMENT_DRAFT_TYPES)[number];

export const ANNOUNCEMENT_SECTION_IDS: Record<AnnouncementDraftType, string> = {
  MTR_1030: "announcement-mtr-1030",
  MTR_1630: "announcement-mtr-1630",
  LAST_PARADE_1730: "announcement-last-parade",
  MORNING_LAB: "announcement-morning-lab",
  FIRST_PARADE: "announcement-first-parade",
  PT: "announcement-pt",
  REQUEST_DI_FP: "announcement-request-di-fp",
  REQUEST_LP: "announcement-request-lp",
};

export const CURRENT_AFFAIR_SECTION_ID = "announcement-current-affair-sharing";

export const DEFAULT_ANNOUNCEMENT_TIMES = {
  MTR_1030: "1030",
  MTR_1630: "1630",
  LAST_PARADE_1730: "2000",
  FIRST_PARADE: "0545",
  PT: "0715",
  CURRENT_AFFAIR_REMINDER: "1000",
  CURRENT_AFFAIR_SHARING: "1330",
  REQUEST_DI_FP: "1800",
  REQUEST_LP: "2005",
  PARADE_STATE_MORNING: "0545",
  PARADE_STATE_NIGHT: "2000",
} as const;

export const WEEKLY_TODO_SYSTEM_KEYS = {
  SBA_IC: "SBA_IC",
  CA_SHARING: "CA_SHARING",
} as const;
