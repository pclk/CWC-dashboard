"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import {
  clearAdminSession,
  createAdminSession,
  getAdminSession,
  isValidAdminPassword,
} from "@/lib/admin-auth";
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
import { adminChangePasswordSchema, adminDashboardLoginSchema } from "@/lib/validators/auth";

type AdminPerson = {
  label: string;
  details?: string;
};

type AdminTimelineItem = AdminPerson & {
  appointmentAt: string;
  dateLabel: string;
};

export type AdminTimelineEvent = {
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

export type AdminOverview = {
  account: {
    email: string;
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
    people: AdminPerson[];
  }>;
  categories: Array<{
    key: string;
    label: string;
    count: number;
    people: AdminPerson[];
  }>;
  upcomingMaPersonnel: AdminTimelineItem[];
  timeline: AdminTimelineEvent[];
  todayAppointments: AdminPerson[];
};

export type AdminOverviewResult = ActionResult & {
  overview?: AdminOverview;
};

async function authenticateAdmin(email: string, adminPassword: string) {
  if (!isValidAdminPassword(adminPassword)) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });
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

async function buildAdminOverview(user: {
  id: string;
  email: string;
  displayName: string | null;
}) {
  const now = new Date();
  const todayBounds = getSingaporeDayBounds(now);
  const [activeCadets, operationalRecords, summary, todayAppointments, settingsBundle, paradeInput] =
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
    ]);
  const activeCadetIds = new Set(activeCadets.map((cadet) => cadet.id));
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
      currentFit: [] as AdminPerson[],
      currentStatus: [] as AdminPerson[],
      notInCamp: [] as AdminPerson[],
    },
  );

  const timelineEvents: AdminTimelineEvent[] = [];

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
      email: user.email,
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
  } satisfies AdminOverview;
}

export async function adminDashboardLoginAction(input: {
  email: string;
  adminPassword: string;
}): Promise<AdminOverviewResult> {
  const parsed = adminDashboardLoginSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid admin login details.");
  }

  const user = await authenticateAdmin(parsed.data.email, parsed.data.adminPassword);

  if (!user) {
    return failure("Invalid admin credentials.");
  }

  await createAdminSession(user);
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Admin login successful.",
    overview: await buildAdminOverview(user),
  };
}

export async function adminDashboardLogoutAction(): Promise<ActionResult> {
  await clearAdminSession();
  revalidatePath("/admin");

  return success("Signed out.");
}

export async function getCurrentAdminOverview() {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  return buildAdminOverview({
    id: session.userId,
    email: session.email,
    displayName: session.displayName,
  });
}

export async function changeUserPasswordAsAdminAction(input: {
  email: string;
  adminPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = adminChangePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid admin payload.");
  }

  const session = await getAdminSession();

  if (!session || session.email !== parsed.data.email) {
    return failure("Admin session expired. Sign in again.");
  }

  if (!isValidAdminPassword(parsed.data.adminPassword)) {
    return failure("Invalid admin credentials.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const revokedAt = new Date();

  const [, revokedSessions] = await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    }),
    prisma.userSession.updateMany({
      where: {
        userId: session.userId,
        revokedAt: null,
      },
      data: {
        revokedAt,
        revokedReason: "PASSWORD_CHANGED",
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/settings");

  const revokedMessage =
    revokedSessions.count === 1
      ? "1 active session was signed out."
      : `${revokedSessions.count} active sessions were signed out.`;

  return success(`Password updated. ${revokedMessage}`);
}
