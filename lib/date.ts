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

export type StrengthPeriod = "morning" | "afternoon" | "evening";

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

  switch (weekday.toLowerCase()) {
    case "thu":
      return "THURS";
    case "tue":
      return "TUES";
    default:
      return weekday.toUpperCase();
  }
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
