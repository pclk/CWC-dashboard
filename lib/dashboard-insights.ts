import { formatDisplayDateTime, getSingaporeStrengthPeriod } from "@/lib/date";
import type { ParadeStateInput } from "@/lib/generators/parade-state";

export type DashboardPerson = {
  label: string;
  details?: string;
};

export type DashboardStrengthBucket = {
  key: "current_fit" | "current_status" | "not_in_camp";
  label: string;
  count: number;
  people: DashboardPerson[];
};

export type DashboardTimelineEvent = {
  id: string;
  type: "status" | "absence" | "appointment";
  typeLabel: string;
  cadetLabel: string;
  title: string;
  subtitle?: string;
  startAt: string;
  endAt: string;
  startLabel: string;
  endLabel: string;
  isInstant: boolean;
};

type ActiveCadet = {
  id: string;
  rank: string;
  displayName: string;
};

type OperationalRecord = {
  id: string;
  cadetId: string;
  category: string;
  title: string | null;
  details: string | null;
  startAt: Date | null;
  endAt: Date | null;
  unknownEndTime: boolean;
  affectsStrength: boolean;
  cadet: {
    active: boolean;
    rank: string;
    displayName: string;
  };
};

type TodayAppointment = {
  cadetId: string | null;
  title: string;
  venue: string | null;
  appointmentAt: Date;
  affectsMorningStrength: boolean;
  affectsAfternoonStrength: boolean;
  affectsEveningStrength: boolean;
  cadet: {
    active: boolean;
  } | null;
};

function formatRecordPerson(record: {
  rank: string;
  name: string;
  details?: string;
  endAt?: Date | null;
  unknownEndTime?: boolean;
}) {
  const details = [
    record.details,
    record.unknownEndTime
      ? "End TBC"
      : record.endAt
        ? `Until ${formatDisplayDateTime(record.endAt)}`
        : undefined,
  ].filter(Boolean);

  return {
    label: `${record.rank} ${record.name}`,
    details: details.join(" / ") || undefined,
  };
}

function appointmentAffectsCurrentStrength(
  appointment: {
    affectsMorningStrength: boolean;
    affectsAfternoonStrength: boolean;
    affectsEveningStrength: boolean;
  },
  period: "morning" | "afternoon" | "evening",
) {
  if (period === "morning") {
    return appointment.affectsMorningStrength;
  }

  if (period === "afternoon") {
    return appointment.affectsAfternoonStrength;
  }

  return appointment.affectsEveningStrength;
}

export function buildDashboardStrengthBuckets({
  activeCadets,
  operationalRecords,
  todayAppointments,
  now,
}: {
  activeCadets: ActiveCadet[];
  operationalRecords: OperationalRecord[];
  todayAppointments: TodayAppointment[];
  now: Date;
}) {
  const activeCadetIds = new Set(activeCadets.map((cadet) => cadet.id));
  const currentStrengthPeriod = getSingaporeStrengthPeriod(now);
  const absenceDetailsByCadet = new Map<string, string[]>();
  const statusDetailsByCadet = new Map<string, string[]>();

  for (const record of operationalRecords) {
    if (!activeCadetIds.has(record.cadetId) || !record.cadet.active) {
      continue;
    }

    const recordDetails = formatRecordPerson({
      rank: record.cadet.rank,
      name: record.cadet.displayName,
      details: record.details ?? record.title ?? undefined,
      endAt: record.endAt,
      unknownEndTime: record.unknownEndTime,
    }).details;

    if (record.affectsStrength) {
      const details = absenceDetailsByCadet.get(record.cadetId) ?? [];
      details.push([record.category, recordDetails].filter(Boolean).join(": "));
      absenceDetailsByCadet.set(record.cadetId, details);
    }

    if (record.category === "STATUS_RESTRICTION") {
      const details = statusDetailsByCadet.get(record.cadetId) ?? [];
      details.push(recordDetails || "Status restriction");
      statusDetailsByCadet.set(record.cadetId, details);
    }
  }

  for (const appointment of todayAppointments) {
    if (
      !appointment.cadetId ||
      !appointment.cadet?.active ||
      !appointmentAffectsCurrentStrength(appointment, currentStrengthPeriod)
    ) {
      continue;
    }

    const details = absenceDetailsByCadet.get(appointment.cadetId) ?? [];
    details.push(
      [
        "MA/OA",
        appointment.title,
        appointment.venue,
        formatDisplayDateTime(appointment.appointmentAt),
      ]
        .filter(Boolean)
        .join(": "),
    );
    absenceDetailsByCadet.set(appointment.cadetId, details);
  }

  const people = activeCadets.reduce(
    (buckets, cadet) => {
      const label = `${cadet.rank} ${cadet.displayName}`;
      const absenceDetails = absenceDetailsByCadet.get(cadet.id);

      if (absenceDetails?.length) {
        buckets.notInCamp.push({
          label,
          details: absenceDetails.join(" / "),
        });
        return buckets;
      }

      const statusDetails = statusDetailsByCadet.get(cadet.id);

      if (statusDetails?.length) {
        buckets.currentStatus.push({
          label,
          details: statusDetails.join(" / "),
        });
        return buckets;
      }

      buckets.currentFit.push({ label });
      return buckets;
    },
    {
      currentFit: [] as DashboardPerson[],
      currentStatus: [] as DashboardPerson[],
      notInCamp: [] as DashboardPerson[],
    },
  );

  return [
    {
      key: "current_fit",
      label: "Current Fit",
      count: people.currentFit.length,
      people: people.currentFit,
    },
    {
      key: "current_status",
      label: "Status",
      count: people.currentStatus.length,
      people: people.currentStatus,
    },
    {
      key: "not_in_camp",
      label: "Not In Camp",
      count: people.notInCamp.length,
      people: people.notInCamp,
    },
  ] satisfies DashboardStrengthBucket[];
}

export function buildDashboardTimeline({
  activeCadets,
  operationalRecords,
  upcomingAppointments,
  now,
}: {
  activeCadets: ActiveCadet[];
  operationalRecords: OperationalRecord[];
  upcomingAppointments: ParadeStateInput["upcomingAppointments"];
  now: Date;
}) {
  const activeCadetIds = new Set(activeCadets.map((cadet) => cadet.id));
  const timelineEvents: DashboardTimelineEvent[] = [];

  for (const record of operationalRecords) {
    if (!activeCadetIds.has(record.cadetId) || !record.cadet.active) {
      continue;
    }

    if (!record.endAt || record.endAt.getTime() <= now.getTime()) {
      continue;
    }

    const isStatus = record.category === "STATUS_RESTRICTION";
    const isAbsence = record.affectsStrength && !isStatus;

    if (!isStatus && !isAbsence) {
      continue;
    }

    const startAt = record.startAt ?? now;
    const titleParts = [record.title, record.category].filter(Boolean) as string[];
    const title = isStatus
      ? record.title || "Status Restriction"
      : titleParts[0] ?? record.category;

    timelineEvents.push({
      id: `record-${record.id}`,
      type: isStatus ? "status" : "absence",
      typeLabel: isStatus ? "Status" : record.category,
      cadetLabel: record.cadet.displayName,
      title,
      subtitle: record.details ?? undefined,
      startAt: startAt.toISOString(),
      endAt: record.endAt.toISOString(),
      startLabel: formatDisplayDateTime(startAt),
      endLabel: formatDisplayDateTime(record.endAt),
      isInstant: false,
    });
  }

  upcomingAppointments.forEach((appointment, index) => {
    timelineEvents.push({
      id: `appointment-${index}-${appointment.appointmentAt.toISOString()}`,
      type: "appointment",
      typeLabel: "MA/OA",
      cadetLabel: appointment.name,
      title: appointment.title,
      subtitle: appointment.venue ?? undefined,
      startAt: appointment.appointmentAt.toISOString(),
      endAt: appointment.appointmentAt.toISOString(),
      startLabel: formatDisplayDateTime(appointment.appointmentAt),
      endLabel: formatDisplayDateTime(appointment.appointmentAt),
      isInstant: true,
    });
  });

  return timelineEvents.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
