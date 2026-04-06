const SINGAPORE_TIME_ZONE = "Asia/Singapore";
const SINGAPORE_OFFSET_SUFFIX = "+08:00";
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const COMPACT_DATE_REGEX = /^(\d{2})(\d{2})(\d{2})$/;
const COMPACT_DATETIME_REGEX = /^(\d{2})(\d{2})(\d{2})[\sT-]?(\d{2}):?(\d{2})$/;
const WEEKDAY_INDEX_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
} as const;
const CURRENT_AFFAIR_WEEKDAY_TO_OFFSET = {
  MON: 0,
  TUE: 1,
  WED: 2,
  THU: 3,
  FRI: 4,
} as const;
const MONTH_NAME_TO_NUMBER = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
} as const;

export type StrengthPeriod = "morning" | "afternoon" | "evening";
export const CURRENT_AFFAIR_WEEKDAY_OPTIONS = ["MON", "TUE", "WED", "THU", "FRI"] as const;
export type CurrentAffairWeekday = (typeof CURRENT_AFFAIR_WEEKDAY_OPTIONS)[number];

function getParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
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
    hour: get("hour"),
    minute: get("minute"),
  };
}

function buildValidatedSingaporeDate(
  year: string,
  month: string,
  day: string,
  hour = "00",
  minute = "00",
) {
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:00${SINGAPORE_OFFSET_SUFFIX}`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date input.");
  }

  const parts = getParts(parsed);

  if (
    parts.year !== year ||
    parts.month !== month ||
    parts.day !== day ||
    parts.hour !== hour ||
    parts.minute !== minute
  ) {
    throw new Error("Invalid date input.");
  }

  return parsed;
}

function toFourDigitYear(shortYear: string) {
  return `20${shortYear}`;
}

export function formatCompactDmy(date: Date) {
  const parts = getParts(date);
  return `${parts.day}${parts.month}${parts.year.slice(-2)}`;
}

export function formatCompactDmyHm(date: Date) {
  const parts = getParts(date);
  return `${formatCompactDmy(date)} ${parts.hour}${parts.minute}`;
}

export function formatDisplayDateTime(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(date);
}

export function formatTimeText(date: Date) {
  const parts = getParts(date);
  return `${parts.hour}${parts.minute}`;
}

export function getSingaporeStrengthPeriod(date: Date): StrengthPeriod {
  const hour = Number(getParts(date).hour);

  if (hour < 12) {
    return "morning";
  }

  if (hour < 17) {
    return "afternoon";
  }

  return "evening";
}

export function formatCompactDateInputValue(date?: Date | null) {
  if (!date) return "";

  return formatCompactDmy(date);
}

export function formatCompactDateTimeInputValue(date?: Date | null) {
  if (!date) return "";

  return formatCompactDmyHm(date);
}

export function formatDateTimeInputValue(date?: Date | null) {
  if (!date) return "";

  const parts = getParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseSingaporeInputToUtc(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(ISO_DATETIME_REGEX);

  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch;
    return buildValidatedSingaporeDate(year, month, day, hour, minute);
  }

  const compactMatch = trimmed.match(COMPACT_DATETIME_REGEX);

  if (compactMatch) {
    const [, day, month, shortYear, hour, minute] = compactMatch;
    return buildValidatedSingaporeDate(toFourDigitYear(shortYear), month, day, hour, minute);
  }

  throw new Error("Invalid date and time. Use DDMMYY HHMM.");
}

export function parseSingaporeDateInputToUtc(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const isoMatch = trimmed.match(ISO_DATE_REGEX);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return buildValidatedSingaporeDate(year, month, day);
  }

  const compactMatch = trimmed.match(COMPACT_DATE_REGEX);

  if (compactMatch) {
    const [, day, month, shortYear] = compactMatch;
    return buildValidatedSingaporeDate(toFourDigitYear(shortYear), month, day);
  }

  throw new Error("Invalid date. Use DDMMYY.");
}

export function parseSingaporeLooseDateInputToUtc(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return parseSingaporeDateInputToUtc(trimmed);
  } catch {
    // Fall through to support short forms like "6 Apr".
  }

  const shortDateMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{2}|\d{4}))?$/);

  if (!shortDateMatch) {
    throw new Error("Invalid date. Use DDMMYY or D MMM.");
  }

  const [, dayValue, monthValue, yearValue] = shortDateMatch;
  const month = MONTH_NAME_TO_NUMBER[monthValue.toLowerCase() as keyof typeof MONTH_NAME_TO_NUMBER];

  if (!month) {
    throw new Error("Invalid date. Use DDMMYY or D MMM.");
  }

  const parts = getParts(new Date());
  const year = yearValue
    ? yearValue.length === 2
      ? toFourDigitYear(yearValue)
      : yearValue
    : parts.year;

  return buildValidatedSingaporeDate(year, month, dayValue.padStart(2, "0"));
}

export function getSingaporeDayBounds(date = new Date()) {
  const parts = getParts(date);
  const start = new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00${SINGAPORE_OFFSET_SUFFIX}`,
  );
  const end = new Date(
    `${parts.year}-${parts.month}-${parts.day}T23:59:59.999${SINGAPORE_OFFSET_SUFFIX}`,
  );

  return { start, end };
}

export function getSingaporeNow() {
  return new Date();
}

export function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatShortDayMonth(date: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatWeekdayLabel(date: Date) {
  const weekday = new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    weekday: "short",
  }).format(date);

  return weekday.toUpperCase();
}

export function formatCurrentAffairWeekday(date: Date): CurrentAffairWeekday | "SAT" | "SUN" {
  return formatWeekdayLabel(date) as CurrentAffairWeekday | "SAT" | "SUN";
}

export function getSingaporeWeekBounds(date = new Date()) {
  const parts = getParts(date);
  const currentDayStart = new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00${SINGAPORE_OFFSET_SUFFIX}`,
  );
  const weekday = new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    weekday: "short",
  })
    .format(date)
    .toLowerCase() as keyof typeof WEEKDAY_INDEX_MAP;
  const dayOfWeek = WEEKDAY_INDEX_MAP[weekday] ?? 0;
  const start = new Date(currentDayStart.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + (24 * 60 * 60 * 1000 - 1));

  return { start, end };
}

export function getCurrentAffairWeekBounds(date = new Date()) {
  const parts = getParts(date);
  const currentDayStart = new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00${SINGAPORE_OFFSET_SUFFIX}`,
  );
  const weekday = new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    weekday: "short",
  })
    .format(date)
    .toLowerCase() as keyof typeof WEEKDAY_INDEX_MAP;
  const dayOfWeek = WEEKDAY_INDEX_MAP[weekday] ?? 0;
  const dayOffset =
    dayOfWeek === WEEKDAY_INDEX_MAP.sat
      ? 2
      : dayOfWeek === WEEKDAY_INDEX_MAP.sun
        ? 1
        : 1 - dayOfWeek;
  const start = new Date(currentDayStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000 + (24 * 60 * 60 * 1000 - 1));

  return { start, end };
}

export function resolveCurrentAffairWeekdayDate(
  weekday: CurrentAffairWeekday,
  anchorDate = new Date(),
) {
  const { start } = getCurrentAffairWeekBounds(anchorDate);
  const dayOffset = CURRENT_AFFAIR_WEEKDAY_TO_OFFSET[weekday];

  return new Date(start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
}
