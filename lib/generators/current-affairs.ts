import { formatShortDayMonth, formatWeekdayLabel } from "@/lib/date";
import { renderTemplate } from "@/lib/formatting";

type CurrentAffairEntry = {
  sharingDate: Date;
  scope: string;
  presenter: string;
  title: string;
};

function normalizeWhitespace(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function formatCurrentAffairDateRange(start: Date, end: Date) {
  return `${formatShortDayMonth(start)} - ${formatShortDayMonth(end)}`;
}

export function renderCurrentAffairEntriesBlock(entries: CurrentAffairEntry[]) {
  if (!entries.length) {
    return "NIL";
  }

  return entries
    .map(
      (entry) =>
        `${formatWeekdayLabel(entry.sharingDate)} ${entry.scope} (${entry.presenter}): ${entry.title}`,
    )
    .join("\n\n");
}

export function generateCurrentAffairSharingMessage(
  template: string,
  input: { dateRange: string; entries: CurrentAffairEntry[] },
) {
  return normalizeWhitespace(
    renderTemplate(template, {
      dateRange: input.dateRange,
      entriesBlock: renderCurrentAffairEntriesBlock(input.entries),
    }),
  );
}

export function generateCurrentAffairReminderMessage(
  template: string,
  input: { time: string },
) {
  return normalizeWhitespace(
    renderTemplate(template, {
      time: input.time,
    }),
  );
}
