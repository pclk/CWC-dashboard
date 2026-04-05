import { renderTemplate } from "@/lib/formatting";

export const PT_ACTIVITY_SUGGESTIONS = ["DI", "ER", "S&G"] as const;

function normalizeWhitespace(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function buildLocationSuffix(location?: string) {
  if (!location?.trim()) {
    return "";
  }

  return `At ${location.trim()}.`;
}

function generateAnnouncementMessage(
  template: string,
  values: Record<string, string | number | null | undefined>,
) {
  return normalizeWhitespace(renderTemplate(template, values));
}

export function getMorningLabDefaultTime(isPtDay: boolean) {
  return isPtDay ? "1015" : "0745";
}

export function generateMtrAnnouncementMessage(template: string, input: { time: string; location?: string }) {
  return generateAnnouncementMessage(template, {
    time: input.time,
    location: input.location ?? "",
    locationSuffix: buildLocationSuffix(input.location),
  });
}

export function generateLastParadeMessage(template: string, input: { time: string; location: string }) {
  return generateAnnouncementMessage(template, {
    time: input.time,
    location: input.location,
  });
}

export function generateRoutineAnnouncementMessage(
  template: string,
  input: { time: string; activity?: string },
) {
  return generateAnnouncementMessage(template, {
    time: input.time,
    activity: input.activity ?? "",
  });
}
