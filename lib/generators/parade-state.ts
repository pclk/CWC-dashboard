import { DEFAULT_ANNOUNCEMENT_TIMES } from "@/lib/announcement-config";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";
import {
  formatCompactDateTimeInputValue,
  formatCompactDmy,
  formatCompactDmyHm,
  formatTimeText,
} from "@/lib/date";
import { renderLines, renderNamedList, renderTemplate } from "@/lib/formatting";

export type ParadeStateInput = {
  unitName: string;
  prefix: string;
  caaLine: string;
  totalStrength: number;
  presentStrength: number;
  notInCampCounts: {
    hospitalizationLeave: number;
    rso: number;
    mc: number;
    other: number;
  };
  groupedRecords: {
    mc: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    rso: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    rsi: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    cl: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    others: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    status: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
  };
  maOaAppointments: Array<{
    rank: string;
    name: string;
    title: string;
    venue?: string | null;
    appointmentAt: Date;
  }>;
  upcomingAppointments: Array<{
    rank: string;
    name: string;
    title: string;
    venue?: string | null;
    appointmentAt: Date;
  }>;
};

export function buildParadeCaaLine(reportAt: Date) {
  return formatCompactDmyHm(reportAt);
}

export function getDefaultParadeReportAtValue(
  reportType: "Morning" | "Night" | "Custom",
  now = new Date(),
) {
  if (reportType === "Morning") {
    return `${formatCompactDmy(now)} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_MORNING}`;
  }

  if (reportType === "Night") {
    return `${formatCompactDmy(now)} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_NIGHT}`;
  }

  return formatCompactDateTimeInputValue(now);
}

function formatAppointmentCadetName(name: string) {
  if (name.includes(",")) {
    return name;
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return name;
  }

  return `${parts.slice(0, -1).join(" ")}, ${parts.at(-1)}`;
}

function buildAppointmentSubject(item: ParadeStateInput["upcomingAppointments"][number]) {
  const title = item.title.trim();
  const venue = item.venue?.trim() ?? "";

  if (title && venue) {
    return title.toLowerCase().includes(venue.toLowerCase()) ? title : `${venue} ${title}`;
  }

  return title || venue || "Appointment";
}

function renderAppointmentList(items: ParadeStateInput["upcomingAppointments"]) {
  if (!items.length) return "NIL";

  return items
    .map(
      (item, index) =>
        `${index + 1}) ${item.rank} ${formatAppointmentCadetName(item.name)}\n(${buildAppointmentSubject(item)}, ${formatCompactDmy(item.appointmentAt)}, ${formatTimeText(item.appointmentAt)})`,
    )
    .join("\n");
}

function formatRecordDateSpan(startAt?: Date | null, endAt?: Date | null, unknownEndTime?: boolean) {
  if (unknownEndTime) {
    const formattedStart = startAt ? formatCompactDmy(startAt) : "TBC";
    return `${formattedStart} - TBC`;
  }

  if (startAt && endAt) {
    const formattedStart = formatCompactDmy(startAt);
    const formattedEnd = formatCompactDmy(endAt);

    return formattedStart === formattedEnd ? formattedStart : `${formattedStart} - ${formattedEnd}`;
  }

  if (endAt) {
    return formatCompactDmy(endAt);
  }

  if (startAt) {
    return formatCompactDmy(startAt);
  }

  return "";
}

function buildNotInCampBlock(counts: ParadeStateInput["notInCampCounts"]) {
  return renderLines(
    [
      counts.hospitalizationLeave > 0 ? `${counts.hospitalizationLeave}x HL` : "",
      counts.rso > 0 ? `${counts.rso}x RSO` : "",
      counts.mc > 0 ? `${counts.mc}x MC` : "",
    ].filter(Boolean),
    "",
  );
}

function stripLegacyZeroNotInCampLines(text: string) {
  return text
    .replace(/^(\s*\d+x HL):\s*$/gm, "$1")
    .replace(/^\s*0x HL:?\s*$\n?/gm, "")
    .replace(/^\s*0x RSO\s*$\n?/gm, "")
    .replace(/^\s*0x MC\s*$\n?/gm, "")
    .replace(/^\s*Hospitalisation leave:\s*0\s*$\n?/gm, "")
    .replace(/^\s*RSO:\s*0\s*$\n?/gm, "")
    .replace(/^\s*MC:\s*0\s*$\n?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderDetailedRecordList(
  items: Array<{
    rank: string;
    name: string;
    details?: string;
    startAt?: Date | null;
    endAt?: Date | null;
    unknownEndTime?: boolean;
  }>,
) {
  if (!items.length) return "NIL";

  return items
    .map((item, index) => {
      const dateSpan = formatRecordDateSpan(item.startAt, item.endAt, item.unknownEndTime);
      const formattedDetails = item.details?.replace(": ", ", ");

      if (formattedDetails && dateSpan) {
        return `${index + 1}) ${item.rank} ${item.name} - ${formattedDetails} (${dateSpan})`;
      }

      if (formattedDetails) {
        return `${index + 1}) ${item.rank} ${item.name} - ${formattedDetails}`;
      }

      if (dateSpan) {
        return `${index + 1}) ${item.rank} ${item.name} (${dateSpan})`;
      }

      return `${index + 1}) ${item.rank} ${item.name}`;
    })
    .join("\n");
}

export function generateParadeStateMessage(
  input: ParadeStateInput,
  template = DEFAULT_TEMPLATE_BODIES.PARADE_MORNING,
) {
  return stripLegacyZeroNotInCampLines(
    renderTemplate(template, {
      prefix: input.prefix,
      unitName: input.unitName,
      caaLine: input.caaLine,
      totalStrength: input.totalStrength,
      presentStrength: input.presentStrength,
      hospitalizationLeave: input.notInCampCounts.hospitalizationLeave,
      rso: input.notInCampCounts.rso,
      mc: input.notInCampCounts.mc,
      other: input.notInCampCounts.other,
      notInCampBlock: buildNotInCampBlock(input.notInCampCounts),
      ma_oaBlock: renderAppointmentList(input.maOaAppointments),
      mcBlock: renderDetailedRecordList(input.groupedRecords.mc),
      rsoBlock: renderNamedList(input.groupedRecords.rso),
      rsiBlock: renderNamedList(input.groupedRecords.rsi),
      clBlock: renderDetailedRecordList(input.groupedRecords.cl),
      othersBlock: renderDetailedRecordList(input.groupedRecords.others),
      statusBlock: renderDetailedRecordList(input.groupedRecords.status),
      appointmentsBlock: renderAppointmentList(input.upcomingAppointments),
    }),
  );
}
