const SINGAPORE_TIME_ZONE = "Asia/Singapore";
const SINGAPORE_OFFSET_SUFFIX = "+08:00";

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

export function formatCompactDmyHm(date: Date) {
  const parts = getParts(date);
  return `${parts.day}${parts.month}${parts.year.slice(-2)}, ${parts.hour}${parts.minute}`;
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

export function formatDateTimeInputValue(date?: Date | null) {
  if (!date) return "";

  const parts = getParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseSingaporeInputToUtc(value?: string | null) {
  if (!value) return null;

  const normalized = value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(`${normalized}${SINGAPORE_OFFSET_SUFFIX}`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date input");
  }

  return parsed;
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
