import { renderTemplate } from "@/lib/formatting";

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

export function generateMtrAnnouncementMessage(template: string, input: { time: string; location?: string }) {
  return normalizeWhitespace(
    renderTemplate(template, {
      time: input.time,
      location: input.location ?? "",
      locationSuffix: buildLocationSuffix(input.location),
    }),
  );
}

export function generateLastParadeMessage(template: string, input: { time: string; location: string }) {
  return normalizeWhitespace(
    renderTemplate(template, {
      time: input.time,
      location: input.location,
    }),
  );
}
