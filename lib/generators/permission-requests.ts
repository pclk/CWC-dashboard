import { renderTemplate } from "@/lib/formatting";

function normalizeWhitespace(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

function buildFirstTimeIntro(input: {
  name: string;
  cohortName: string;
  firstTime: boolean;
}) {
  return input.firstTime
    ? `I am ${input.name} from ${input.cohortName}, `
    : "";
}

export function generateRequestDiMessage(
  template: string,
  input: {
    recipient: string;
    name: string;
    cohortName: string;
    location: string;
    time: string;
    firstTime: boolean;
  },
) {
  const intro = buildFirstTimeIntro(input);

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
    name: string;
    cohortName: string;
    location: string;
    time: string;
    firstTime: boolean;
  },
) {
  return normalizeWhitespace(
    renderTemplate(template, {
      recipient: input.recipient,
      intro: buildFirstTimeIntro(input),
      location: input.location,
      time: input.time,
    }),
  );
}
