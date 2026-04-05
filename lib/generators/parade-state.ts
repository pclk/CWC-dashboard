import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";
import { formatCompactDmy, formatCompactDmyHm, formatTimeText } from "@/lib/date";
import { renderNamedList, renderTemplate } from "@/lib/formatting";

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
    mc: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null }>;
    rso: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null }>;
    rsi: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null }>;
    cl: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null }>;
    others: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null }>;
    status: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null }>;
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

export function buildParadeCaaLine(reportAt: Date, reportTimeLabel?: string) {
  if (reportTimeLabel?.trim()) {
    return `${formatCompactDmyHm(reportAt)} (${reportTimeLabel.trim()})`;
  }

  return formatCompactDmyHm(reportAt);
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
        `${index + 1}) ${item.rank} ${formatAppointmentCadetName(item.name)}\n(${buildAppointmentSubject(item)},\n${formatCompactDmy(item.appointmentAt)}, ${formatTimeText(item.appointmentAt)})`,
    )
    .join("\n");
}

function formatRecordDateSpan(startAt?: Date | null, endAt?: Date | null) {
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

function renderDetailedRecordList(
  items:
    | ParadeStateInput["groupedRecords"]["mc"]
    | ParadeStateInput["groupedRecords"]["cl"]
    | ParadeStateInput["groupedRecords"]["others"],
) {
  if (!items.length) return "NIL";

  return items
    .map((item, index) => {
      const dateSpan = formatRecordDateSpan(item.startAt, item.endAt);
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
  return renderTemplate(template, {
    prefix: input.prefix,
    unitName: input.unitName,
    caaLine: input.caaLine,
    totalStrength: input.totalStrength,
    presentStrength: input.presentStrength,
    hospitalizationLeave: input.notInCampCounts.hospitalizationLeave,
    rso: input.notInCampCounts.rso,
    mc: input.notInCampCounts.mc,
    other: input.notInCampCounts.other,
    ma_oaBlock: renderAppointmentList(input.maOaAppointments),
    mcBlock: renderDetailedRecordList(input.groupedRecords.mc),
    rsoBlock: renderNamedList(input.groupedRecords.rso),
    rsiBlock: renderNamedList(input.groupedRecords.rsi),
    clBlock: renderDetailedRecordList(input.groupedRecords.cl),
    othersBlock: renderDetailedRecordList(input.groupedRecords.others),
    statusBlock: renderNamedList(input.groupedRecords.status),
    appointmentsBlock: renderAppointmentList(input.upcomingAppointments),
  }).trim();
}
