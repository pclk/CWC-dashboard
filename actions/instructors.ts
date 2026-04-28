"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { syncUserCadetRecordStats } from "@/lib/cadet-record-stats";
import {
  clearInstructorSession,
  createInstructorSession,
  getInstructorSession,
} from "@/lib/instructor-auth";
import { formatDisplayDateTime, getSingaporeDayBounds, getSingaporeStrengthPeriod } from "@/lib/date";
import {
  buildParadeStateInput,
  computeStrengthSummary,
  getActiveCadets,
  getOperationalRecords,
  getUpcomingAppointments,
  getSettingsAndTemplates,
} from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getRecordCategoryLabel, RECORD_CATEGORY_VALUES, type AppRecordCategory } from "@/lib/record-categories";
import {
  instructorChangeBatchNameSchema,
  instructorDashboardLoginSchema,
} from "@/lib/validators/auth";

type InstructorPerson = {
  label: string;
  details?: string;
};

type InstructorTimelineItem = InstructorPerson & {
  appointmentAt: string;
  dateLabel: string;
};

export type InstructorTimelineEvent = {
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

export type InstructorOverview = {
  account: {
    batchName: string;
    displayName: string | null;
  };
  generatedAt: string;
  unitName: string;
  strength: {
    total: number;
    present: number;
    absent: number;
    presentPercent: number;
  };
  strengthBuckets: Array<{
    key: "current_fit" | "current_status" | "not_in_camp";
    label: string;
    count: number;
    people: InstructorPerson[];
  }>;
  categories: Array<{
    key: string;
    label: string;
    count: number;
    people: InstructorPerson[];
  }>;
  upcomingMaPersonnel: InstructorTimelineItem[];
  timeline: InstructorTimelineEvent[];
  todayAppointments: InstructorPerson[];
  recordHeatmap: {
    categories: Array<{
      key: AppRecordCategory;
      label: string;
    }>;
    cadets: Array<{
      id: string;
      label: string;
      displayName: string;
      stats: Array<{
        category: AppRecordCategory;
        recordCount: number;
        totalDays: number;
      }>;
    }>;
  };
};

export type InstructorOverviewResult = ActionResult & {
  overview?: InstructorOverview;
};

async function authenticateInstructor(batchName: string, instructorPassword: string) {
  const user = await prisma.user.findUnique({
    where: { batchName },
    select: {
      id: true,
      batchName: true,
      displayName: true,
      instructorPasswordHash: true,
    },
  });

  if (!user) {
    return null;
  }

  const valid = await bcrypt.compare(instructorPassword, user.instructorPasswordHash);

  return valid ? user : null;
}

function formatRecordPerson(record: {
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
    label: record.name,
    details: details.join(" / ") || undefined,
  };
}

function formatAppointmentPerson(appointment: {
  name: string;
  title: string;
  venue?: string | null;
  appointmentAt: Date;
}) {
  return {
    label: appointment.name,
    details: [
      appointment.title,
      appointment.venue,
      formatDisplayDateTime(appointment.appointmentAt),
    ]
      .filter(Boolean)
      .join(" / "),
  };
}

function formatTimelineAppointment(appointment: {
  name: string;
  title: string;
  venue?: string | null;
  appointmentAt: Date;
}) {
  return {
    label: appointment.name,
    details: [appointment.title, appointment.venue].filter(Boolean).join(" / ") || undefined,
    appointmentAt: appointment.appointmentAt.toISOString(),
    dateLabel: formatDisplayDateTime(appointment.appointmentAt),
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

async function buildInstructorOverview(user: {
  id: string;
  batchName: string;
  displayName: string | null;
}) {
  const now = new Date();
  const todayBounds = getSingaporeDayBounds(now);
  await prisma.$transaction((tx) => syncUserCadetRecordStats(tx, user.id));
  const [activeCadets, operationalRecords, summary, todayAppointments, settingsBundle, paradeInput, recordStats] =
    await Promise.all([
      getActiveCadets(user.id),
      getOperationalRecords(user.id),
      computeStrengthSummary(user.id, now),
      getUpcomingAppointments(user.id, todayBounds.start, todayBounds.end),
      getSettingsAndTemplates(user.id),
      buildParadeStateInput(user.id, {
        reportType: "Custom",
        reportAt: now,
      }),
      prisma.cadetRecordStat.findMany({
        where: { userId: user.id },
        orderBy: [{ category: "asc" }],
      }),
    ]);
  const activeCadetIds = new Set(activeCadets.map((cadet) => cadet.id));
  const statsByCadetId = new Map<string, typeof recordStats>();

  for (const stat of recordStats) {
    const cadetStats = statsByCadetId.get(stat.cadetId) ?? [];
    cadetStats.push(stat);
    statsByCadetId.set(stat.cadetId, cadetStats);
  }
  const currentStrengthPeriod = getSingaporeStrengthPeriod(now);
  const absenceDetailsByCadet = new Map<string, string[]>();
  const statusDetailsByCadet = new Map<string, string[]>();

  for (const record of operationalRecords) {
    if (!activeCadetIds.has(record.cadetId) || !record.cadet.active) {
      continue;
    }

    const recordDetails = formatRecordPerson({
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

  const strengthBucketPeople = activeCadets.reduce(
    (buckets, cadet) => {
      const label = cadet.displayName;
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
      currentFit: [] as InstructorPerson[],
      currentStatus: [] as InstructorPerson[],
      notInCamp: [] as InstructorPerson[],
    },
  );

  const timelineEvents: InstructorTimelineEvent[] = [];

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

  paradeInput.upcomingAppointments.forEach((appointment, index) => {
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

  timelineEvents.sort((a, b) => a.startAt.localeCompare(b.startAt));

  const categoryInputs = [
    { key: "mc", label: "MC Personnel", people: paradeInput.groupedRecords.mc.map(formatRecordPerson) },
    {
      key: "ma_oa",
      label: "MA/OA Today",
      people: paradeInput.maOaAppointments.map(formatAppointmentPerson),
    },
    { key: "rso", label: "RSO Personnel", people: paradeInput.groupedRecords.rso.map(formatRecordPerson) },
    { key: "rsi", label: "RSI Personnel", people: paradeInput.groupedRecords.rsi.map(formatRecordPerson) },
    { key: "cl", label: "CL Personnel", people: paradeInput.groupedRecords.cl.map(formatRecordPerson) },
    { key: "others", label: "HL / Others", people: paradeInput.groupedRecords.others.map(formatRecordPerson) },
    { key: "status", label: "Status Restrictions", people: paradeInput.groupedRecords.status.map(formatRecordPerson) },
  ];

  return {
    account: {
      batchName: user.batchName,
      displayName: user.displayName,
    },
    generatedAt: formatDisplayDateTime(now),
    unitName: settingsBundle.settings.unitName,
    strength: {
      total: summary.totalStrength,
      present: summary.presentStrength,
      absent: summary.absentCount,
      presentPercent:
        summary.totalStrength > 0
          ? Math.round((summary.presentStrength / summary.totalStrength) * 100)
          : 0,
    },
    strengthBuckets: [
      {
        key: "current_fit",
        label: "Current Fit",
        count: strengthBucketPeople.currentFit.length,
        people: strengthBucketPeople.currentFit,
      },
      {
        key: "current_status",
        label: "Status",
        count: strengthBucketPeople.currentStatus.length,
        people: strengthBucketPeople.currentStatus,
      },
      {
        key: "not_in_camp",
        label: "Not In Camp",
        count: strengthBucketPeople.notInCamp.length,
        people: strengthBucketPeople.notInCamp,
      },
    ],
    categories: categoryInputs.map((category) => ({
      ...category,
      count: category.people.length,
    })),
    upcomingMaPersonnel: paradeInput.upcomingAppointments
      .slice(0, 12)
      .map(formatTimelineAppointment),
    timeline: timelineEvents,
    todayAppointments: todayAppointments.map((appointment) => ({
      label: appointment.cadet ? appointment.cadet.displayName : "General",
      details: [
        appointment.title,
        appointment.venue,
        formatDisplayDateTime(appointment.appointmentAt),
      ]
        .filter(Boolean)
        .join(" / "),
    })),
    recordHeatmap: {
      categories: RECORD_CATEGORY_VALUES.map((category) => ({
        key: category,
        label: getRecordCategoryLabel(category),
      })),
      cadets: activeCadets.map((cadet) => ({
        id: cadet.id,
        label: cadet.shorthand?.trim() || cadet.displayName,
        displayName: cadet.displayName,
        stats: (statsByCadetId.get(cadet.id) ?? [])
          .filter((stat) => RECORD_CATEGORY_VALUES.includes(stat.category as AppRecordCategory))
          .map((stat) => ({
            category: stat.category as AppRecordCategory,
            recordCount: stat.recordCount,
            totalDays: stat.totalDays ?? 0,
          })),
      })),
    },
  } satisfies InstructorOverview;
}

export async function instructorDashboardLoginAction(input: {
  batchName: string;
  instructorPassword: string;
}): Promise<InstructorOverviewResult> {
  const parsed = instructorDashboardLoginSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid instructor login details.");
  }

  const user = await authenticateInstructor(parsed.data.batchName, parsed.data.instructorPassword);

  if (!user) {
    return failure("Invalid instructor credentials.");
  }

  await createInstructorSession(user);
  revalidatePath("/cwc/instructors");

  return {
    ok: true,
    message: "Instructor login successful.",
    overview: await buildInstructorOverview(user),
  };
}

export async function instructorDashboardLogoutAction(): Promise<ActionResult> {
  await clearInstructorSession();
  revalidatePath("/cwc/instructors");

  return success("Signed out.");
}

export async function getCurrentInstructorOverview() {
  const session = await getInstructorSession();

  if (!session) {
    return null;
  }

  return buildInstructorOverview({
    id: session.userId,
    batchName: session.batchName,
    displayName: session.displayName,
  });
}

export async function changeBatchNameAsInstructorAction(input: {
  batchName: string;
}): Promise<ActionResult & { batchName?: string }> {
  const parsed = instructorChangeBatchNameSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid batch name payload.");
  }

  const session = await getInstructorSession();

  if (!session) {
    return failure("Instructor session expired. Sign in again.");
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { batchName: parsed.data.batchName },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      (error as { code?: string }).code === "P2002"
    ) {
      return failure("That batch name is already in use.");
    }

    throw error;
  }

  revalidatePath("/cwc/instructors");

  return {
    ok: true,
    message: "Batch name updated.",
    batchName: parsed.data.batchName,
  };
}
