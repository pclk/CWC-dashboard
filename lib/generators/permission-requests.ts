import { renderTemplate } from "@/lib/formatting";

function normalizeWhitespace(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function generateRequestDiMessage(
  template: string,
  input: {
    recipient: string;
    rank: string;
    name: string;
    cohortName: string;
    location: string;
    time: string;
    firstTime: boolean;
  },
) {
  const intro = input.firstTime
    ? `I am ${input.rank} ${input.name} from ${input.cohortName}, `
    : "";

  return normalizeWhitespace(
    renderTemplate(template, {
      recipient: input.recipient,
      intro,
      location: input.location,
      time: input.time,
    }),
  );
}

export function generateRequestLpMessage(
  template: string,
  input: {
    recipient: string;
    location: string;
    time: string;
  },
) {
  return normalizeWhitespace(
    renderTemplate(template, {
      recipient: input.recipient,
      location: input.location,
      time: input.time,
    }),
  );
}
