import { CetActivityType } from "@prisma/client";

const SINGAPORE_TIME_ZONE = "Asia/Singapore";
const SINGAPORE_OFFSET_SUFFIX = "+08:00";
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const HHMM_REGEX = /^(\d{2}):(\d{2})$/;

export const CET_ACTIVITY_TYPE_OPTIONS = [
  { value: "LAB", label: "Lab" },
  { value: "PT", label: "PT" },
  { value: "BUNK", label: "Bunk" },
  { value: "COOKHOUSE", label: "Cookhouse" },
  { value: "MEDICAL", label: "Medical" },
  { value: "OTHER", label: "Other" },
] as const satisfies ReadonlyArray<{ value: CetActivityType; label: string }>;

export const CET_ACTIVITY_TYPE_LABELS: Record<CetActivityType, string> = {
  LAB: "Lab",
  PT: "PT",
  BUNK: "Bunk",
  COOKHOUSE: "Cookhouse",
  MEDICAL: "Medical",
  OTHER: "Other",
};

export type CetActivityStyle = {
  badge: string;
  block: string;
  accent: string;
};

const CET_ACTIVITY_STYLES: Record<CetActivityType, CetActivityStyle> = {
  LAB: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    block: "bg-blue-50 border-blue-300 text-blue-900",
    accent: "bg-blue-500",
  },
  PT: {
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    block: "bg-orange-50 border-orange-300 text-orange-900",
    accent: "bg-orange-500",
  },
  BUNK: {
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    block: "bg-purple-50 border-purple-300 text-purple-900",
    accent: "bg-purple-500",
  },
  COOKHOUSE: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    block: "bg-amber-50 border-amber-300 text-amber-900",
    accent: "bg-amber-500",
  },
  MEDICAL: {
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    block: "bg-rose-50 border-rose-300 text-rose-900",
    accent: "bg-rose-500",
  },
  OTHER: {
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    block: "bg-slate-50 border-slate-300 text-slate-900",
    accent: "bg-slate-500",
  },
};

export function getCetActivityStyle(activityType: CetActivityType): CetActivityStyle {
  return CET_ACTIVITY_STYLES[activityType] ?? CET_ACTIVITY_STYLES.OTHER;
}

export function getCetActivityLabel(activityType: CetActivityType): string {
  return CET_ACTIVITY_TYPE_LABELS[activityType] ?? CET_ACTIVITY_TYPE_LABELS.OTHER;
}

function getSingaporeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    weekday: get("weekday"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function buildSingaporeDate(
  year: string,
  month: string,
  day: string,
  hour: string,
  minute: string,
) {
  const parsed = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:00${SINGAPORE_OFFSET_SUFFIX}`,
  );

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid Singapore date/time.");
  }

  return parsed;
}

function normalizeDateInput(date: Date | string): { year: string; month: string; day: string } {
  if (date instanceof Date) {
    const parts = getSingaporeParts(date);
    return { year: parts.year, month: parts.month, day: parts.day };
  }

  const match = date.trim().match(ISO_DATE_REGEX);

  if (!match) {
    throw new Error("Invalid date. Expected YYYY-MM-DD.");
  }

  const [, year, month, day] = match;
  return { year, month, day };
}

function normalizeTimeInput(time: string): { hour: string; minute: string } {
  const match = time.trim().match(HHMM_REGEX);

  if (!match) {
    throw new Error("Invalid time. Expected HH:mm.");
  }

  const [, hour, minute] = match;
  const hourNum = Number(hour);
  const minuteNum = Number(minute);

  if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
    throw new Error("Invalid time. Expected HH:mm.");
  }

  return { hour, minute };
}

export function combineSingaporeDateAndTimeToUtc(
  date: Date | string,
  time: string,
): Date {
  const { year, month, day } = normalizeDateInput(date);
  const { hour, minute } = normalizeTimeInput(time);

  return buildSingaporeDate(year, month, day, hour, minute);
}

export function getSingaporeDayBounds(date: Date | string = new Date()): {
  start: Date;
  end: Date;
} {
  const { year, month, day } = normalizeDateInput(date);

  const start = new Date(
    `${year}-${month}-${day}T00:00:00${SINGAPORE_OFFSET_SUFFIX}`,
  );
  const end = new Date(
    `${year}-${month}-${day}T23:59:59.999${SINGAPORE_OFFSET_SUFFIX}`,
  );

  return { start, end };
}

export function getSingaporeDayStart(date: Date | string = new Date()): Date {
  return getSingaporeDayBounds(date).start;
}

export function isSingaporeWeekend(date: Date | string): boolean {
  const { year, month, day } = normalizeDateInput(date);
  const parts = getSingaporeParts(
    new Date(`${year}-${month}-${day}T12:00:00${SINGAPORE_OFFSET_SUFFIX}`),
  );

  return parts.weekday === "Sat" || parts.weekday === "Sun";
}

export function getSingaporeToday(now: Date = new Date()): Date {
  return getSingaporeDayBounds(now).start;
}

export function getSingaporeTomorrow(now: Date = new Date()): Date {
  const today = getSingaporeToday(now);
  return new Date(today.getTime() + 24 * 60 * 60 * 1000);
}

export function addSingaporeDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function getSingaporeIsoDate(date: Date): string {
  const { year, month, day } = getSingaporeParts(date);
  return `${year}-${month}-${day}`;
}

export function getSingaporeTimeOfDay(date: Date): string {
  const { hour, minute } = getSingaporeParts(date);
  return `${hour}:${minute}`;
}

export function formatCetTime(date: Date): string {
  const { hour, minute } = getSingaporeParts(date);
  return `${hour}${minute}`;
}

export function formatCetTimeRange(start: Date, end: Date): string {
  return `${formatCetTime(start)} - ${formatCetTime(end)}`;
}

export type CetTimeRangeValidationError =
  | "START_REQUIRED"
  | "END_REQUIRED"
  | "INVALID_START"
  | "INVALID_END"
  | "END_BEFORE_START";

export type CetTimeRangeValidationResult =
  | { ok: true; startTime: string; endTime: string }
  | { ok: false; error: CetTimeRangeValidationError; message: string };

export function validateCetTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): CetTimeRangeValidationResult {
  const trimmedStart = (startTime ?? "").trim();
  const trimmedEnd = (endTime ?? "").trim();

  if (!trimmedStart) {
    return { ok: false, error: "START_REQUIRED", message: "Start time is required." };
  }

  if (!trimmedEnd) {
    return { ok: false, error: "END_REQUIRED", message: "End time is required." };
  }

  let start: { hour: string; minute: string };
  let end: { hour: string; minute: string };

  try {
    start = normalizeTimeInput(trimmedStart);
  } catch {
    return { ok: false, error: "INVALID_START", message: "Start time must be HH:mm." };
  }

  try {
    end = normalizeTimeInput(trimmedEnd);
  } catch {
    return { ok: false, error: "INVALID_END", message: "End time must be HH:mm." };
  }

  const startMinutes = Number(start.hour) * 60 + Number(start.minute);
  const endMinutes = Number(end.hour) * 60 + Number(end.minute);

  if (endMinutes <= startMinutes) {
    return {
      ok: false,
      error: "END_BEFORE_START",
      message: "End time must be after start time.",
    };
  }

  return {
    ok: true,
    startTime: `${start.hour}:${start.minute}`,
    endTime: `${end.hour}:${end.minute}`,
  };
}
