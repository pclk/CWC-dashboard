import {
  CetActivityType,
  CetBlockSource,
  CetVisibility,
  type CetActorRole,
  type Prisma,
} from "@prisma/client";

import { getSingaporeDayBounds, getSingaporeDayStart, isSingaporeWeekend } from "@/lib/cet";
import { ensureCetConfiguration } from "@/lib/cet-configuration";
import { prisma } from "@/lib/prisma";

export type CetTimelineTargetCadet = {
  id: string;
  name: string;
};

export type CetTimelineBlock = {
  id: string;
  source: CetBlockSource;
  readonly: boolean;
  title: string;
  activityType: CetActivityType;
  startAt: Date;
  endAt: Date;
  estimatedDuration: boolean;
  venue: { id: string | null; name: string | null } | null;
  attire: { id: string | null; name: string | null } | null;
  requiredItems: string | null;
  remarks: string | null;
  visibility: CetVisibility;
  targetCadets: CetTimelineTargetCadet[];
  createdByRole: CetActorRole | null;
  createdByName: string | null;
  updatedByRole: CetActorRole | null;
  updatedByName: string | null;
  scheduleId: string | null;
};

const BLOCK_INCLUDE = {
  venue: { select: { id: true, name: true } },
  attire: { select: { id: true, name: true } },
  targetCadets: {
    select: {
      cadetId: true,
      cadet: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.CetDayBlockInclude;

type CetBlockWithRelations = Prisma.CetDayBlockGetPayload<{ include: typeof BLOCK_INCLUDE }>;

type AppointmentRow = {
  id: string;
  cadetId: string | null;
  title: string;
  venue: string | null;
  appointmentAt: Date;
  notes: string | null;
  cadet: { id: string; displayName: string; active: boolean } | null;
};

const APPOINTMENT_DEFAULT_DURATION_MINUTES = 30;

function compareTimelineBlocks(a: CetTimelineBlock, b: CetTimelineBlock) {
  const startDiff = a.startAt.getTime() - b.startAt.getTime();
  if (startDiff !== 0) return startDiff;

  const endDiff = a.endAt.getTime() - b.endAt.getTime();
  if (endDiff !== 0) return endDiff;

  return a.title.localeCompare(b.title);
}

async function assertCadetBelongsToUser(userId: string, cadetId: string) {
  const cadet = await prisma.cadet.findFirst({
    where: { id: cadetId, userId },
    select: { id: true },
  });

  if (!cadet) {
    throw new Error("Cadet not found.");
  }
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

type CetHistorySnapshot = {
  startAt?: unknown;
  endAt?: unknown;
  visibility?: unknown;
  targetCadets?: unknown;
  deletedAt?: unknown;
};

function parseCetHistorySnapshot(value: Prisma.JsonValue | null): CetHistorySnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

function snapshotOverlapsDay(snapshot: CetHistorySnapshot, dayStart: Date, dayEnd: Date) {
  if (typeof snapshot.startAt !== "string" || typeof snapshot.endAt !== "string") {
    return false;
  }

  const startAt = new Date(snapshot.startAt);
  const endAt = new Date(snapshot.endAt);

  return isValidDate(startAt) && isValidDate(endAt) && startAt <= dayEnd && endAt >= dayStart;
}

function snapshotVisibleToCadet(snapshot: CetHistorySnapshot, cadetId: string) {
  if (snapshot.deletedAt) {
    return false;
  }

  if (snapshot.visibility === CetVisibility.COHORT) {
    return true;
  }

  if (
    snapshot.visibility !== CetVisibility.SELECTED_CADETS ||
    !Array.isArray(snapshot.targetCadets)
  ) {
    return false;
  }

  return snapshot.targetCadets.some((target) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      return false;
    }

    return "id" in target && target.id === cadetId;
  });
}

function snapshotRelevantToCadetDate(
  snapshot: CetHistorySnapshot | null,
  cadetId: string,
  dayStart: Date,
  dayEnd: Date,
) {
  if (!snapshot) {
    return false;
  }

  return (
    snapshotVisibleToCadet(snapshot, cadetId) &&
    snapshotOverlapsDay(snapshot, dayStart, dayEnd)
  );
}

function manualBlockToTimeline(block: CetBlockWithRelations): CetTimelineBlock {
  return {
    id: block.id,
    source: block.source,
    readonly: false,
    title: block.title,
    activityType: block.activityType,
    startAt: block.startAt,
    endAt: block.endAt,
    estimatedDuration: false,
    venue: block.venue
      ? { id: block.venue.id, name: block.venue.name }
      : null,
    attire: block.attire
      ? { id: block.attire.id, name: block.attire.name }
      : null,
    requiredItems: block.requiredItems,
    remarks: block.remarks,
    visibility: block.visibility,
    targetCadets: block.targetCadets
      .filter((target) => Boolean(target.cadet))
      .map((target) => ({
        id: target.cadetId,
        name: target.cadet?.displayName ?? "",
      })),
    createdByRole: block.createdByRole,
    createdByName: block.createdByName,
    updatedByRole: block.updatedByRole,
    updatedByName: block.updatedByName,
    scheduleId: block.scheduleId,
  };
}

function appointmentToTimeline(appointment: AppointmentRow): CetTimelineBlock {
  const startAt = appointment.appointmentAt;
  const endAt = new Date(startAt.getTime() + APPOINTMENT_DEFAULT_DURATION_MINUTES * 60 * 1000);
  const targetCadets: CetTimelineTargetCadet[] = appointment.cadet
    ? [{ id: appointment.cadet.id, name: appointment.cadet.displayName }]
    : [];

  return {
    id: `appointment:${appointment.id}`,
    source: CetBlockSource.APPOINTMENT_IMPORT,
    readonly: true,
    title: `MA/OA: ${appointment.title}`,
    activityType: CetActivityType.MEDICAL,
    startAt,
    endAt,
    estimatedDuration: true,
    venue: appointment.venue ? { id: null, name: appointment.venue } : null,
    attire: null,
    requiredItems: null,
    remarks: appointment.notes,
    visibility: CetVisibility.SELECTED_CADETS,
    targetCadets,
    createdByRole: null,
    createdByName: null,
    updatedByRole: null,
    updatedByName: null,
    scheduleId: null,
  };
}

async function loadDayBlocks(userId: string, start: Date, end: Date) {
  return prisma.cetDayBlock.findMany({
    where: {
      userId,
      deletedAt: null,
      startAt: { gte: start, lte: end },
    },
    include: BLOCK_INCLUDE,
    orderBy: [{ startAt: "asc" }, { endAt: "asc" }, { title: "asc" }],
  });
}

async function hasCetDaySchedule(userId: string, date: Date | string) {
  const dayStart = getSingaporeDayStart(date);
  const schedule = await prisma.cetDaySchedule.findUnique({
    where: { userId_date: { userId, date: dayStart } },
    select: { id: true },
  });

  return Boolean(schedule);
}

async function loadDayAppointments(
  userId: string,
  start: Date,
  end: Date,
  cadetIdFilter: string | null = null,
): Promise<AppointmentRow[]> {
  return prisma.appointment.findMany({
    where: {
      userId,
      appointmentAt: { gte: start, lte: end },
      ...(cadetIdFilter ? { cadetId: cadetIdFilter } : {}),
    },
    select: {
      id: true,
      cadetId: true,
      title: true,
      venue: true,
      appointmentAt: true,
      notes: true,
      cadet: { select: { id: true, displayName: true, active: true } },
    },
    orderBy: { appointmentAt: "asc" },
  });
}

export async function getCetTimelineForEditor(
  userId: string,
  date: Date | string,
): Promise<CetTimelineBlock[]> {
  await ensureCetConfiguration(userId);
  if (isSingaporeWeekend(date) && !(await hasCetDaySchedule(userId, date))) {
    return [];
  }

  const { start, end } = getSingaporeDayBounds(date);
  const [blocks, appointments] = await Promise.all([
    loadDayBlocks(userId, start, end),
    loadDayAppointments(userId, start, end),
  ]);

  const timeline: CetTimelineBlock[] = [
    ...blocks.map(manualBlockToTimeline),
    ...appointments.map(appointmentToTimeline),
  ];

  timeline.sort(compareTimelineBlocks);
  return timeline;
}

export async function getCetTimelineForCadet(
  userId: string,
  cadetId: string,
  date: Date | string,
): Promise<CetTimelineBlock[]> {
  await ensureCetConfiguration(userId);
  if (isSingaporeWeekend(date) && !(await hasCetDaySchedule(userId, date))) {
    return [];
  }

  const { start, end } = getSingaporeDayBounds(date);
  const [blocks, appointments] = await Promise.all([
    prisma.cetDayBlock.findMany({
      where: {
        userId,
        deletedAt: null,
        startAt: { gte: start, lte: end },
        OR: [
          { visibility: CetVisibility.COHORT },
          {
            visibility: CetVisibility.SELECTED_CADETS,
            targetCadets: { some: { cadetId } },
          },
        ],
      },
      include: BLOCK_INCLUDE,
      orderBy: [{ startAt: "asc" }, { endAt: "asc" }, { title: "asc" }],
    }),
    loadDayAppointments(userId, start, end, cadetId),
  ]);

  const timeline: CetTimelineBlock[] = [
    ...blocks.map((block) => {
      const timelineBlock = manualBlockToTimeline(block);

      if (timelineBlock.visibility !== CetVisibility.SELECTED_CADETS) {
        return timelineBlock;
      }

      return {
        ...timelineBlock,
        targetCadets: timelineBlock.targetCadets.filter((target) => target.id === cadetId),
      };
    }),
    ...appointments.map(appointmentToTimeline),
  ];

  timeline.sort(compareTimelineBlocks);
  return timeline;
}

export type CetCadetNotificationState = {
  hasUpdates: boolean;
  lastViewedAt: Date | null;
};

export async function getCetCadetNotificationState(
  userId: string,
  cadetId: string,
  date: Date | string,
): Promise<CetCadetNotificationState> {
  await assertCadetBelongsToUser(userId, cadetId);
  if (isSingaporeWeekend(date) && !(await hasCetDaySchedule(userId, date))) {
    return { hasUpdates: false, lastViewedAt: null };
  }

  const { start, end } = getSingaporeDayBounds(date);
  const dayStart = start;
  const viewState = await prisma.cetCadetViewState.findUnique({
    where: { cadetId_date: { cadetId, date: dayStart } },
    select: { lastViewedAt: true },
  });

  if (!viewState) {
    return { hasUpdates: false, lastViewedAt: null };
  }

  const currentBlockUpdate = prisma.cetDayBlock.findFirst({
    where: {
      userId,
      deletedAt: null,
      startAt: { gte: start, lte: end },
      updatedAt: { gt: viewState.lastViewedAt },
      OR: [
        { visibility: CetVisibility.COHORT },
        {
          visibility: CetVisibility.SELECTED_CADETS,
          targetCadets: { some: { cadetId } },
        },
      ],
    },
    select: { id: true },
  });
  const appointmentUpdate = prisma.appointment.findFirst({
    where: {
      userId,
      cadetId,
      appointmentAt: { gte: start, lte: end },
      updatedAt: { gt: viewState.lastViewedAt },
    },
    select: { id: true },
  });
  const historyEntries = prisma.cetDayBlockHistory.findMany({
    where: {
      userId,
      createdAt: { gt: viewState.lastViewedAt },
    },
    select: {
      beforeJson: true,
      afterJson: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const [updatedBlock, updatedAppointment, histories] = await Promise.all([
    currentBlockUpdate,
    appointmentUpdate,
    historyEntries,
  ]);

  if (updatedBlock || updatedAppointment) {
    return { hasUpdates: true, lastViewedAt: viewState.lastViewedAt };
  }

  const hasRelevantHistory = histories.some((entry) => {
    const before = parseCetHistorySnapshot(entry.beforeJson);
    const after = parseCetHistorySnapshot(entry.afterJson);

    return (
      snapshotRelevantToCadetDate(before, cadetId, start, end) ||
      snapshotRelevantToCadetDate(after, cadetId, start, end)
    );
  });

  return { hasUpdates: hasRelevantHistory, lastViewedAt: viewState.lastViewedAt };
}

export async function markCetDateViewed(
  userId: string,
  cadetId: string,
  date: Date | string,
): Promise<void> {
  await assertCadetBelongsToUser(userId, cadetId);

  const dayStart = getSingaporeDayBounds(date).start;
  const now = new Date();

  await prisma.cetCadetViewState.upsert({
    where: { cadetId_date: { cadetId, date: dayStart } },
    update: {
      lastViewedAt: now,
    },
    create: {
      userId,
      cadetId,
      date: dayStart,
      lastViewedAt: now,
    },
  });
}

export type CetDashboardTimelineEntry = {
  id: string;
  title: string;
  activityType: CetActivityType;
  startAt: Date;
  endAt: Date;
  venueName: string | null;
  visibility: CetVisibility;
  source: CetBlockSource;
  readonly: boolean;
  targetCount: number;
};

export async function getCetTimelineForDashboard(
  userId: string,
  date: Date | string,
): Promise<CetDashboardTimelineEntry[]> {
  const timeline = await getCetTimelineForEditor(userId, date);

  return timeline.map((block) => ({
    id: block.id,
    title: block.title,
    activityType: block.activityType,
    startAt: block.startAt,
    endAt: block.endAt,
    venueName: block.venue?.name ?? null,
    visibility: block.visibility,
    source: block.source,
    readonly: block.readonly,
    targetCount: block.targetCadets.length,
  }));
}
