import {
  type Bunk,
  type Cadet,
  type CadetRecord,
  type CurrentAffairSharing,
  type DutyInstructor,
  type MessageTemplate,
  type Prisma,
  RecordCategory,
  ResolutionState,
  TemplateType,
  type WeeklyTodo,
} from "@prisma/client";

import {
  formatCompactDmyHm,
  getCurrentAffairWeekBounds,
  getSingaporeDayBounds,
  getSingaporeStrengthPeriod,
  type StrengthPeriod,
} from "@/lib/date";
import { WEEKLY_TODO_SYSTEM_KEYS } from "@/lib/announcement-config";
import { type BookInInput } from "@/lib/generators/book-in";
import { resolveNightStudyAssignments, type NightStudyMode } from "@/lib/night-study";
import { buildParadeCaaLine, type ParadeStateInput } from "@/lib/generators/parade-state";
import { renderTemplate } from "@/lib/formatting";
import { prisma } from "@/lib/prisma";
import {
  buildAbsentCadetIds,
  computeNotInCampCounts,
  OPERATIONAL_RECORD_STATES,
} from "@/lib/strength";
import {
  DEFAULT_SETTINGS_VALUES,
  DEFAULT_TEMPLATE_BODIES,
  DEFAULT_TEMPLATE_DEFINITIONS,
  LEGACY_DEFAULT_TEMPLATE_BODIES,
} from "@/lib/templates";

type OperationalRecordWithCadet = Prisma.CadetRecordGetPayload<{
  include: {
    cadet: {
      select: {
        id: true;
        rank: true;
        displayName: true;
        active: true;
        sortOrder: true;
      };
    };
  };
}>;

type AppointmentWithCadet = Prisma.AppointmentGetPayload<{
  include: {
    cadet: {
      select: {
        id: true;
        rank: true;
        displayName: true;
        active: true;
        sortOrder: true;
      };
    };
  };
}>;

type CurrentAffairSharingRow = CurrentAffairSharing;
type DutyInstructorRow = DutyInstructor;
type WeeklyTodoRow = WeeklyTodo;

const DEFAULT_WEEKLY_TODOS = [
  { systemKey: WEEKLY_TODO_SYSTEM_KEYS.SBA_IC, title: "SBA IC", sortOrder: 0 },
  { systemKey: WEEKLY_TODO_SYSTEM_KEYS.CA_SHARING, title: "CA sharing", sortOrder: 1 },
] as const;

function sortCadets(cadets: Cadet[]) {
  return [...cadets].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.displayName.localeCompare(right.displayName),
  );
}

function sortOperationalRecords(records: OperationalRecordWithCadet[]) {
  return [...records].sort(
    (left, right) =>
      left.cadet.sortOrder - right.cadet.sortOrder ||
      left.cadet.displayName.localeCompare(right.cadet.displayName) ||
      left.sortOrder - right.sortOrder ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
}

function sortAppointments(appointments: AppointmentWithCadet[]) {
  return [...appointments].sort(
    (left, right) =>
      left.appointmentAt.getTime() - right.appointmentAt.getTime() ||
      (left.cadet?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.cadet?.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      (left.cadet?.displayName ?? "").localeCompare(right.cadet?.displayName ?? ""),
  );
}

function sortWeeklyTodos(todos: WeeklyTodoRow[]) {
  return [...todos].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.title.localeCompare(right.title) ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
}

function sortCurrentAffairSharings(entries: CurrentAffairSharingRow[]) {
  return [...entries].sort(
    (left, right) =>
      left.sharingDate.getTime() - right.sharingDate.getTime() ||
      left.sortOrder - right.sortOrder ||
      left.presenter.localeCompare(right.presenter) ||
      left.title.localeCompare(right.title),
  );
}

function sortDutyInstructors(entries: DutyInstructorRow[]) {
  return [...entries].sort(
    (left, right) =>
      left.dutyDate.getTime() - right.dutyDate.getTime() ||
      left.rank.localeCompare(right.rank) ||
      left.name.localeCompare(right.name),
  );
}

function sortBunks(bunks: Bunk[]) {
  return [...bunks].sort(
    (left, right) =>
      left.bunkNumber - right.bunkNumber ||
      left.bunkId.localeCompare(right.bunkId) ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
}

function buildTemplateMap(rows: MessageTemplate[]) {
  const map = { ...DEFAULT_TEMPLATE_BODIES } as Record<TemplateType, string>;

  for (const type of Object.values(TemplateType)) {
    const exactDefault =
      rows.find((row) => row.type === type && row.isDefault) ??
      rows.find((row) => row.type === type && row.name === "Default") ??
      rows.find((row) => row.type === type);

    if (exactDefault) {
      map[type] = exactDefault.body;
    }
  }

  map.PARADE_NIGHT = map.PARADE_MORNING;

  return map;
}

async function syncLegacyDefaultTemplateBodies(userId: string) {
  const templateMigrations = Object.entries(LEGACY_DEFAULT_TEMPLATE_BODIES) as Array<
    [TemplateType, readonly string[]]
  >;

  await Promise.all(
    templateMigrations.flatMap(([type, legacyBodies]) =>
      legacyBodies.map((legacyBody) =>
        prisma.messageTemplate.updateMany({
          where: {
            userId,
            type,
            isDefault: true,
            body: legacyBody,
          },
          data: {
            body: DEFAULT_TEMPLATE_BODIES[type],
          },
        }),
      ),
    ),
  );
}

async function ensureDefaultWeeklyTodos(userId: string) {
  const existing = await prisma.weeklyTodo.findMany({
    where: { userId },
    select: { systemKey: true },
  });
  const existingKeys = new Set(existing.map((item) => item.systemKey).filter(Boolean));
  const missing = DEFAULT_WEEKLY_TODOS.filter((item) => !existingKeys.has(item.systemKey));

  if (!missing.length) {
    return;
  }

  await prisma.weeklyTodo.createMany({
    data: missing.map((item) => ({
      userId,
      title: item.title,
      systemKey: item.systemKey,
      sortOrder: item.sortOrder,
    })),
    skipDuplicates: true,
  });
}

function buildRecordDetails(record: Pick<CadetRecord, "title" | "details">) {
  const title = record.title?.trim();
  const details = record.details?.trim();

  if (title && details) {
    return `${title}: ${details}`;
  }

  return title || details || undefined;
}

function buildAppointmentSummary(
  appointment: Pick<AppointmentWithCadet, "title" | "venue" | "appointmentAt">,
) {
  const title = appointment.title.trim();
  const venue = appointment.venue?.trim() ?? "";
  const subject =
    title && venue
      ? title.toLowerCase().includes(venue.toLowerCase())
        ? title
        : `${venue} ${title}`
      : title || venue || "Appointment";

  return `${subject} (${formatCompactDmyHm(appointment.appointmentAt)})`;
}

function toNamedRecordItem(record: OperationalRecordWithCadet) {
  return {
    rank: record.cadet.rank,
    name: record.cadet.displayName,
    details: buildRecordDetails(record),
    startAt: record.startAt,
    endAt: record.endAt,
    unknownEndTime: record.unknownEndTime,
  };
}

function groupOperationalRecords(records: OperationalRecordWithCadet[]) {
  return {
    mc: records.filter((record) => record.category === RecordCategory.MC).map(toNamedRecordItem),
    rso: records.filter((record) => record.category === RecordCategory.RSO).map(toNamedRecordItem),
    rsi: records.filter((record) => record.category === RecordCategory.RSI).map(toNamedRecordItem),
    cl: records.filter((record) => record.category === RecordCategory.CL).map(toNamedRecordItem),
    others: records
      .filter((record) => record.category === RecordCategory.OTHER || record.category === RecordCategory.HL)
      .map(toNamedRecordItem),
    status: records
      .filter((record) => record.category === RecordCategory.STATUS_RESTRICTION)
      .map(toNamedRecordItem),
  };
}

const TROOP_MOVEMENT_CATEGORY_ORDER = [
  RecordCategory.MC,
  RecordCategory.HL,
  RecordCategory.RSO,
  RecordCategory.RSI,
  RecordCategory.CL,
  RecordCategory.MA_OA,
  RecordCategory.OTHER,
] as const;

const TROOP_MOVEMENT_CATEGORY_SET = new Set<RecordCategory>(TROOP_MOVEMENT_CATEGORY_ORDER);

function getTroopMovementCategoryLabel(category: RecordCategory) {
  switch (category) {
    case RecordCategory.MA_OA:
      return "MA/OA";
    case RecordCategory.STATUS_RESTRICTION:
      return "STATUS";
    default:
      return category;
  }
}

function buildTroopMovementRemarkSuggestions(records: OperationalRecordWithCadet[]) {
  const groupedCadets = new Map<RecordCategory, Map<string, string>>();

  for (const record of records) {
    if (record.category === RecordCategory.STATUS_RESTRICTION) {
      continue;
    }

    const categoryCadets = groupedCadets.get(record.category) ?? new Map<string, string>();
    categoryCadets.set(record.cadetId, record.cadet.displayName);
    groupedCadets.set(record.category, categoryCadets);
  }

  const orderedCategories = [
    ...TROOP_MOVEMENT_CATEGORY_ORDER.filter((category) => groupedCadets.has(category)),
    ...Array.from(groupedCadets.keys()).filter((category) => !TROOP_MOVEMENT_CATEGORY_SET.has(category)),
  ];

  return orderedCategories.map((category) => {
    const cadetNames = Array.from(groupedCadets.get(category)?.values() ?? []);

    return `${cadetNames.length}x ${getTroopMovementCategoryLabel(category)}: ${cadetNames.join(", ")}`;
  });
}

function inferStrengthPeriod(
  reportAt: Date,
  reportType?: "Morning" | "Night" | "Custom",
): StrengthPeriod {
  if (reportType === "Morning") {
    return "morning";
  }

  if (reportType === "Night") {
    return "evening";
  }

  return getSingaporeStrengthPeriod(reportAt);
}

function appointmentAffectsStrength(appointment: AppointmentWithCadet, period: StrengthPeriod) {
  if (period === "morning") {
    return appointment.affectsMorningStrength;
  }

  if (period === "afternoon") {
    return appointment.affectsAfternoonStrength;
  }

  return appointment.affectsEveningStrength;
}

function getAppointmentStrengthCadetIds(
  appointments: AppointmentWithCadet[],
  reportAt: Date,
  reportType?: "Morning" | "Night" | "Custom",
) {
  const { start, end } = getSingaporeDayBounds(reportAt);
  const strengthPeriod = inferStrengthPeriod(reportAt, reportType);

  return new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.cadetId &&
          appointment.cadet?.active &&
          appointment.appointmentAt >= start &&
          appointment.appointmentAt <= end &&
          appointmentAffectsStrength(appointment, strengthPeriod),
      )
      .map((appointment) => appointment.cadetId as string),
  );
}

function splitAppointmentsForParade(
  appointments: AppointmentWithCadet[],
  reportAt: Date,
  reportType?: "Morning" | "Night" | "Custom",
) {
  const { start, end } = getSingaporeDayBounds(reportAt);
  const eligibleAppointments = sortAppointments(
    appointments.filter((appointment) => appointment.cadetId && appointment.cadet?.active),
  );

  return {
    maOaAppointments: eligibleAppointments
      .filter((appointment) => appointment.appointmentAt >= start && appointment.appointmentAt <= end)
      .map((appointment) => ({
        rank: appointment.cadet?.rank ?? "N/A",
        name: appointment.cadet?.displayName ?? "Unknown",
        title: appointment.title,
        venue: appointment.venue,
        appointmentAt: appointment.appointmentAt,
      })),
    upcomingAppointments: eligibleAppointments
      .filter((appointment) => appointment.appointmentAt > end)
      .map((appointment) => ({
        rank: appointment.cadet?.rank ?? "N/A",
        name: appointment.cadet?.displayName ?? "Unknown",
        title: appointment.title,
        venue: appointment.venue,
        appointmentAt: appointment.appointmentAt,
      })),
    affectingCadetIds: getAppointmentStrengthCadetIds(eligibleAppointments, reportAt, reportType),
  };
}

async function getOperationalDataset(userId: string) {
  await syncExpiredRecordStates(userId);

  const [activeCadets, operationalRecords] = await Promise.all([
    getActiveCadets(userId),
    prisma.cadetRecord.findMany({
      where: {
        userId,
        resolutionState: {
          in: OPERATIONAL_RECORD_STATES,
        },
      },
      include: {
        cadet: {
          select: {
            id: true,
            rank: true,
            displayName: true,
            active: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const activeCadetIds = new Set(activeCadets.map((cadet) => cadet.id));
  const scopedOperationalRecords = sortOperationalRecords(
    operationalRecords.filter((record) => activeCadetIds.has(record.cadetId) && record.cadet.active),
  );

  return {
    activeCadets,
    operationalRecords: scopedOperationalRecords,
  };
}

export async function ensureUserConfiguration(userId: string) {
  await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      unitName: DEFAULT_SETTINGS_VALUES.unitName,
      defaultParadePrefix: DEFAULT_SETTINGS_VALUES.defaultParadePrefix,
      defaultNightPrefix: DEFAULT_SETTINGS_VALUES.defaultNightPrefix,
      defaultLastParadeText: DEFAULT_SETTINGS_VALUES.defaultLastParadeText,
      defaultMtrMorningText: DEFAULT_SETTINGS_VALUES.defaultMtrMorningText,
      defaultMtrAfternoonText: DEFAULT_SETTINGS_VALUES.defaultMtrAfternoonText,
    },
  });

  const templates = await prisma.messageTemplate.findMany({
    where: { userId },
    select: {
      type: true,
      name: true,
    },
  });

  const missingTemplates = DEFAULT_TEMPLATE_DEFINITIONS.filter(
    (definition) =>
      !templates.some(
        (existing) => existing.type === definition.type && existing.name === definition.name,
      ),
  );

  if (missingTemplates.length > 0) {
    await prisma.messageTemplate.createMany({
      data: missingTemplates.map((template) => ({
        userId,
        type: template.type,
        name: template.name,
        body: template.body,
        isDefault: template.isDefault,
      })),
      skipDuplicates: true,
    });
  }

  await syncLegacyDefaultTemplateBodies(userId);
  await ensureDefaultWeeklyTodos(userId);
}

export async function syncExpiredRecordStates(userId: string, now = new Date()) {
  const { start: todayStart } = getSingaporeDayBounds(now);

  await prisma.cadetRecord.updateMany({
    where: {
      userId,
      resolutionState: ResolutionState.ACTIVE,
      endAt: {
        lt: todayStart,
      },
    },
    data: {
      resolutionState: ResolutionState.EXPIRED_PENDING_CONFIRMATION,
    },
  });
}

export async function getUserSettings(userId: string) {
  await ensureUserConfiguration(userId);

  return prisma.userSettings.findUniqueOrThrow({
    where: { userId },
  });
}

export async function getUserTemplateMap(userId: string) {
  await ensureUserConfiguration(userId);

  const templates = await prisma.messageTemplate.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return buildTemplateMap(templates);
}

export async function getSettingsAndTemplates(userId: string) {
  await ensureUserConfiguration(userId);

  const [settings, templates] = await Promise.all([
    prisma.userSettings.findUniqueOrThrow({ where: { userId } }),
    prisma.messageTemplate.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    settings,
    templates,
    templateMap: buildTemplateMap(templates),
  };
}

export async function getActiveCadets(userId: string) {
  const cadets = await prisma.cadet.findMany({
    where: {
      userId,
      active: true,
    },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });

  return sortCadets(cadets);
}

export async function getCadets(userId: string) {
  const cadets = await prisma.cadet.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { displayName: "asc" }],
  });

  return cadets;
}

export async function buildNightStudyContext(userId: string) {
  const [settings, activeCadets] = await Promise.all([
    getUserSettings(userId),
    getActiveCadets(userId),
  ]);
  const mode =
    settings.nightStudyDraftMode === "GO_BACK_BUNK" ? "GO_BACK_BUNK" : "NIGHT_STUDY";
  const primaryNamesText = settings.nightStudyPrimaryNamesText ?? "";
  const earlyPartyNamesText = settings.nightStudyEarlyPartyNamesText ?? "";
  const cadetOptions = activeCadets.map((cadet) => ({
    rank: cadet.rank,
    displayName: cadet.displayName,
  }));

  return {
    mode: mode as NightStudyMode,
    primaryNamesText,
    earlyPartyNamesText,
    activeCadets: cadetOptions,
    resolved: resolveNightStudyAssignments({
      mode,
      primaryNamesText,
      earlyPartyNamesText,
      activeCadets: cadetOptions,
    }),
  };
}

export async function getOperationalRecords(userId: string) {
  await syncExpiredRecordStates(userId);

  const records = await prisma.cadetRecord.findMany({
    where: {
      userId,
      resolutionState: {
        in: OPERATIONAL_RECORD_STATES,
      },
    },
    include: {
      cadet: {
        select: {
          id: true,
          rank: true,
          displayName: true,
          active: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return sortOperationalRecords(records);
}

export async function getAllRecords(userId: string) {
  await syncExpiredRecordStates(userId);

  const records = await prisma.cadetRecord.findMany({
    where: { userId },
    include: {
      cadet: {
        select: {
          id: true,
          rank: true,
          displayName: true,
          active: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return sortOperationalRecords(records as OperationalRecordWithCadet[]);
}

export async function getRecordsNeedingConfirmation(userId: string) {
  await syncExpiredRecordStates(userId);

  const records = await prisma.cadetRecord.findMany({
    where: {
      userId,
      resolutionState: ResolutionState.EXPIRED_PENDING_CONFIRMATION,
    },
    include: {
      cadet: {
        select: {
          id: true,
          rank: true,
          displayName: true,
          active: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ endAt: "asc" }, { updatedAt: "asc" }],
  });

  return sortOperationalRecords(records);
}

export async function getUpcomingAppointments(userId: string, from: Date, to: Date) {
  const appointments = await prisma.appointment.findMany({
    where: {
      userId,
      completed: false,
      appointmentAt: {
        gte: from,
        lte: to,
      },
    },
    include: {
      cadet: {
        select: {
          id: true,
          rank: true,
          displayName: true,
          active: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ appointmentAt: "asc" }],
  });

  return appointments;
}

async function getPendingAppointmentsFrom(userId: string, from: Date) {
  return prisma.appointment.findMany({
    where: {
      userId,
      completed: false,
      appointmentAt: {
        gte: from,
      },
    },
    include: {
      cadet: {
        select: {
          id: true,
          rank: true,
          displayName: true,
          active: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ appointmentAt: "asc" }],
  });
}

export async function getAppointments(userId: string) {
  return prisma.appointment.findMany({
    where: { userId },
    include: {
      cadet: {
        select: {
          id: true,
          rank: true,
          displayName: true,
          active: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [{ completed: "asc" }, { appointmentAt: "asc" }],
  });
}

export async function getWeeklyTodos(userId: string) {
  await ensureUserConfiguration(userId);

  const todos = await prisma.weeklyTodo.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return sortWeeklyTodos(todos);
}

export async function getCurrentAffairSharingsForWeek(userId: string, date = new Date()) {
  await ensureUserConfiguration(userId);
  const { start, end } = getCurrentAffairWeekBounds(date);
  const entries = await prisma.currentAffairSharing.findMany({
    where: {
      userId,
      sharingDate: {
        gte: start,
        lte: end,
      },
    },
    orderBy: [{ sharingDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return sortCurrentAffairSharings(entries);
}

export async function getCurrentAffairSharingsForDay(userId: string, date = new Date()) {
  await ensureUserConfiguration(userId);
  const { start, end } = getSingaporeDayBounds(date);
  const entries = await prisma.currentAffairSharing.findMany({
    where: {
      userId,
      sharingDate: {
        gte: start,
        lte: end,
      },
    },
    orderBy: [{ sharingDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return sortCurrentAffairSharings(entries);
}

export async function getDutyInstructors(userId: string) {
  await ensureUserConfiguration(userId);

  const entries = await prisma.dutyInstructor.findMany({
    where: { userId },
    orderBy: [{ dutyDate: "asc" }],
  });

  return sortDutyInstructors(entries);
}

export async function getDutyInstructorForDate(userId: string, date = new Date()) {
  await ensureUserConfiguration(userId);
  const { start, end } = getSingaporeDayBounds(date);

  return prisma.dutyInstructor.findFirst({
    where: {
      userId,
      dutyDate: {
        gte: start,
        lte: end,
      },
    },
  });
}

export async function getBunks(userId: string) {
  await ensureUserConfiguration(userId);

  const bunks = await prisma.bunk.findMany({
    where: { userId },
    orderBy: [{ bunkNumber: "asc" }, { bunkId: "asc" }, { createdAt: "asc" }],
  });

  return sortBunks(bunks);
}

export async function computeStrengthSummary(userId: string, now = new Date()) {
  const { activeCadets, operationalRecords } = await getOperationalDataset(userId);
  const { start, end } = getSingaporeDayBounds(now);
  const todayAppointments = await getUpcomingAppointments(userId, start, end);

  const operationalAbsentCadetIds = buildAbsentCadetIds(
    operationalRecords.map((record) => ({
      cadetId: record.cadetId,
      affectsStrength: record.affectsStrength,
    })),
  );
  const appointmentAbsentCadetIds = getAppointmentStrengthCadetIds(todayAppointments, now);
  const absentCadetIds = new Set([
    ...operationalAbsentCadetIds,
    ...appointmentAbsentCadetIds,
  ]);

  const totalStrength = activeCadets.length;
  const presentStrength = totalStrength - absentCadetIds.size;

  return {
    totalStrength,
    presentStrength,
    absentCount: absentCadetIds.size,
    notInCampCounts: computeNotInCampCounts(
      operationalRecords.map((record) => ({
        cadetId: record.cadetId,
        category: record.category,
        countsNotInCamp: record.countsNotInCamp,
      })),
    ),
  };
}

export async function buildParadeStateInput(
  userId: string,
  options?: {
    reportType?: "Morning" | "Night" | "Custom";
    reportAt?: Date;
  },
): Promise<ParadeStateInput> {
  const reportAt = options?.reportAt ?? new Date();
  const [{ activeCadets, operationalRecords }, settings] = await Promise.all([
    getOperationalDataset(userId),
    getUserSettings(userId),
  ]);

  const { start } = getSingaporeDayBounds(reportAt);
  const pendingAppointments = await getPendingAppointmentsFrom(userId, start);

  const operationalAbsentCadetIds = buildAbsentCadetIds(
    operationalRecords.map((record) => ({
      cadetId: record.cadetId,
      affectsStrength: record.affectsStrength,
    })),
  );
  const appointmentBuckets = splitAppointmentsForParade(
    pendingAppointments,
    reportAt,
    options?.reportType,
  );
  const absentCadetIds = new Set([
    ...operationalAbsentCadetIds,
    ...appointmentBuckets.affectingCadetIds,
  ]);

  const prefixTemplate =
    options?.reportType === "Night"
      ? settings.defaultNightPrefix || DEFAULT_SETTINGS_VALUES.defaultNightPrefix
      : settings.defaultParadePrefix || DEFAULT_SETTINGS_VALUES.defaultParadePrefix;

  return {
    unitName: settings.unitName,
    prefix: renderTemplate(prefixTemplate, {
      unitName: settings.unitName,
      reportAt: formatCompactDmyHm(reportAt),
    }),
    caaLine: buildParadeCaaLine(reportAt),
    totalStrength: activeCadets.length,
    presentStrength: activeCadets.length - absentCadetIds.size,
    notInCampCounts: computeNotInCampCounts(
      operationalRecords.map((record) => ({
        cadetId: record.cadetId,
        category: record.category,
        countsNotInCamp: record.countsNotInCamp,
      })),
    ),
    groupedRecords: groupOperationalRecords(operationalRecords),
    maOaAppointments: appointmentBuckets.maOaAppointments,
    upcomingAppointments: appointmentBuckets.upcomingAppointments,
  };
}

export async function buildBookInInput(userId: string): Promise<BookInInput> {
  const [{ activeCadets, operationalRecords }, settings] = await Promise.all([
    getOperationalDataset(userId),
    getUserSettings(userId),
  ]);
  const { start, end } = getSingaporeDayBounds();
  const todayAppointments = await getUpcomingAppointments(userId, start, end);

  const operationalAbsentCadetIds = buildAbsentCadetIds(
    operationalRecords.map((record) => ({
      cadetId: record.cadetId,
      affectsStrength: record.affectsStrength,
    })),
  );
  const appointmentAbsentCadetIds = getAppointmentStrengthCadetIds(todayAppointments, new Date());
  const absentCadetIds = new Set([
    ...operationalAbsentCadetIds,
    ...appointmentAbsentCadetIds,
  ]);

  const groupedRecords = groupOperationalRecords(operationalRecords);
  const maOaAppointments = sortAppointments(
    todayAppointments.filter((appointment) => appointment.cadetId && appointment.cadet?.active),
  ).map((appointment) => ({
    rank: appointment.cadet?.rank ?? "N/A",
    name: appointment.cadet?.displayName ?? "Unknown",
    details: buildAppointmentSummary(appointment),
  }));

  return {
    unitName: settings.unitName,
    totalStrength: activeCadets.length,
    presentStrength: activeCadets.length - absentCadetIds.size,
    groupedRecords: {
      ma_oa: maOaAppointments,
      mc: groupedRecords.mc,
      rso: groupedRecords.rso,
      rsi: groupedRecords.rsi,
      cl: groupedRecords.cl,
      others: groupedRecords.others,
    },
  };
}

export async function saveParadeStateSnapshot(
  userId: string,
  payload: {
    label: string;
    reportedAt: Date;
    totalStrength: number;
    presentStrength: number;
    finalMessage: string;
  },
) {
  return prisma.paradeStateSnapshot.create({
    data: {
      userId,
      label: payload.label,
      reportedAt: payload.reportedAt,
      totalStrength: payload.totalStrength,
      presentStrength: payload.presentStrength,
      finalMessage: payload.finalMessage,
    },
  });
}

export async function getParadeStateSnapshots(userId: string) {
  return prisma.paradeStateSnapshot.findMany({
    where: { userId },
    orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function createTroopMovement(
  userId: string,
  payload: {
    fromLocation: string;
    toLocation: string;
    strengthText: string;
    arrivalTimeText: string;
    remarks: string;
    finalMessage: string;
  },
) {
  return prisma.troopMovement.create({
    data: {
      userId,
      fromLocation: payload.fromLocation,
      toLocation: payload.toLocation,
      strengthText: payload.strengthText,
      arrivalTimeText: payload.arrivalTimeText,
      remarks: payload.remarks,
      finalMessage: payload.finalMessage,
    },
  });
}

export async function getTroopMovements(userId: string) {
  return prisma.troopMovement.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getDashboardData(userId: string) {
  const [summary, dueConfirmations, todayAppointments] = await Promise.all([
    computeStrengthSummary(userId),
    getRecordsNeedingConfirmation(userId),
    (async () => {
      const bounds = getSingaporeDayBounds();
      return getUpcomingAppointments(userId, bounds.start, bounds.end);
    })(),
  ]);

  return {
    summary,
    dueConfirmations,
    todayAppointments,
  };
}

export async function buildTroopMovementContext(userId: string) {
  const [settings, summary, operationalRecords, activeCadets] = await Promise.all([
    getUserSettings(userId),
    computeStrengthSummary(userId),
    getOperationalRecords(userId),
    getActiveCadets(userId),
  ]);

  return {
    unitName: settings.unitName,
    totalStrength: summary.totalStrength,
    suggestedStrengthText: `${summary.presentStrength}/${summary.totalStrength}`,
    remarkSuggestions: buildTroopMovementRemarkSuggestions(operationalRecords),
    activeCadets: activeCadets.map((cadet) => ({
      rank: cadet.rank,
      displayName: cadet.displayName,
    })),
  };
}
