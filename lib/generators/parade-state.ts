import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";
import { formatCompactDmyHm } from "@/lib/date";
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
    ma_oa: Array<{ rank: string; name: string; details?: string }>;
    mc: Array<{ rank: string; name: string; details?: string }>;
    rso: Array<{ rank: string; name: string; details?: string }>;
    rsi: Array<{ rank: string; name: string; details?: string }>;
    cl: Array<{ rank: string; name: string; details?: string }>;
    others: Array<{ rank: string; name: string; details?: string }>;
    status: Array<{ rank: string; name: string; details?: string }>;
  };
  upcomingAppointments: Array<{ rank: string; name: string; title: string; appointmentAt: Date }>;
};

export function buildParadeCaaLine(reportAt: Date, reportTimeLabel?: string) {
  if (reportTimeLabel?.trim()) {
    return `${formatCompactDmyHm(reportAt)} (${reportTimeLabel.trim()})`;
  }

  return formatCompactDmyHm(reportAt);
}

function renderAppointmentList(
  items: ParadeStateInput["upcomingAppointments"],
) {
  if (!items.length) return "NIL";

  return items
    .map(
      (item, index) =>
        `${index + 1}) ${item.rank} ${item.name} - ${item.title} (${formatCompactDmyHm(item.appointmentAt)})`,
    )
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
    ma_oaBlock: renderNamedList(input.groupedRecords.ma_oa),
    mcBlock: renderNamedList(input.groupedRecords.mc),
    rsoBlock: renderNamedList(input.groupedRecords.rso),
    rsiBlock: renderNamedList(input.groupedRecords.rsi),
    clBlock: renderNamedList(input.groupedRecords.cl),
    othersBlock: renderNamedList(input.groupedRecords.others),
    statusBlock: renderNamedList(input.groupedRecords.status),
    appointmentsBlock: renderAppointmentList(input.upcomingAppointments),
  }).trim();
}
