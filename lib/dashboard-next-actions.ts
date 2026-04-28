import { TemplateType } from "@prisma/client";

import {
  ANNOUNCEMENT_SECTION_IDS,
  CURRENT_AFFAIR_SECTION_ID,
  DEFAULT_ANNOUNCEMENT_TIMES,
} from "@/lib/announcement-config";
import {
  formatCompactDmy,
  formatTimeText,
  getCurrentAffairWeekBounds,
} from "@/lib/date";
import {
  formatCurrentAffairDateRange,
  generateCurrentAffairReminderMessage,
  generateCurrentAffairSharingMessage,
} from "@/lib/generators/current-affairs";
import {
  generateLastParadeMessage,
  generateMtrAnnouncementMessage,
  generateRoutineAnnouncementMessage,
  getMorningLabDefaultTime,
} from "@/lib/generators/announcements";
import {
  generateRequestDiMessage,
  generateRequestLpMessage,
} from "@/lib/generators/permission-requests";
import { generateParadeStateMessage, type ParadeStateInput } from "@/lib/generators/parade-state";

export type DashboardNextAction = {
  id: string;
  title: string;
  time: string;
  copyText: string;
  href: string;
  hrefLabel: string;
};

type DashboardActionSource = "parade-state" | "announcements" | "current-affairs";

type DashboardActionSettings = {
  announcementMtr1030Time?: string | null;
  announcementMtr1030Location?: string | null;
  announcementMtr1630Time?: string | null;
  announcementMtr1630Location?: string | null;
  announcementLastParadeTime?: string | null;
  announcementLastParadeLocation?: string | null;
  announcementMorningLabTime?: string | null;
  announcementMorningLabIsPt?: boolean;
  announcementFirstParadeTime?: string | null;
  announcementPtTime?: string | null;
  announcementPtActivity?: string | null;
  announcementRequestDiRecipient?: string | null;
  announcementRequestDiName?: string | null;
  announcementRequestDiLocation?: string | null;
  announcementRequestDiTime?: string | null;
  announcementRequestDiFirstTime?: boolean;
  announcementRequestLpRecipient?: string | null;
  announcementRequestLpName?: string | null;
  announcementRequestLpLocation?: string | null;
  announcementRequestLpTime?: string | null;
  announcementRequestLpFirstTime?: boolean;
};

type DashboardCurrentAffairEntry = {
  sharingDate: Date | string;
  scope: "LOCAL" | "OVERSEAS" | "TBC";
  presenter: string;
  title: string;
};

type DashboardNextActionCandidate = DashboardNextAction & {
  source: DashboardActionSource;
};

function resolveTime(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeTimeValue(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length >= 1 && digits.length <= 4) {
    return digits.padStart(4, "0");
  }

  return value.trim();
}

function formatCurrentAffairScopeLabel(scope: DashboardCurrentAffairEntry["scope"]) {
  if (scope === "LOCAL") {
    return "Local";
  }

  if (scope === "OVERSEAS") {
    return "Overseas";
  }

  return "TBC";
}

export function buildDashboardNextActions(input: {
  now?: Date;
  settings: DashboardActionSettings;
  templateMap: Record<TemplateType, string>;
  morningParadeInput: ParadeStateInput;
  nightParadeInput: ParadeStateInput;
  cohortName: string;
  hasCurrentAffairToday: boolean;
  currentAffairWeekEntries: DashboardCurrentAffairEntry[];
}) {
  const now = input.now ?? new Date();
  const currentTime = formatTimeText(now);
  const today = formatCompactDmy(now);
  const morningLabTime = resolveTime(
    input.settings.announcementMorningLabTime,
    getMorningLabDefaultTime(Boolean(input.settings.announcementMorningLabIsPt)),
  );
  const firstParadeTime = resolveTime(
    input.settings.announcementFirstParadeTime,
    DEFAULT_ANNOUNCEMENT_TIMES.FIRST_PARADE,
  );
  const ptTime = resolveTime(input.settings.announcementPtTime, DEFAULT_ANNOUNCEMENT_TIMES.PT);
  const ptActivity = input.settings.announcementPtActivity?.trim() || "DI";
  const mtr1030Time = resolveTime(
    input.settings.announcementMtr1030Time,
    DEFAULT_ANNOUNCEMENT_TIMES.MTR_1030,
  );
  const mtr1630Time = resolveTime(
    input.settings.announcementMtr1630Time,
    DEFAULT_ANNOUNCEMENT_TIMES.MTR_1630,
  );
  const requestDiMessageTime = resolveTime(
    input.settings.announcementRequestDiTime,
    DEFAULT_ANNOUNCEMENT_TIMES.FIRST_PARADE,
  );
  const requestDiRecipient = input.settings.announcementRequestDiRecipient?.trim() || "sir";
  const requestDiName = input.settings.announcementRequestDiName?.trim() || "";
  const requestDiLocation = input.settings.announcementRequestDiLocation?.trim() || "under block 315e";
  const requestLpMessageTime = resolveTime(
    input.settings.announcementRequestLpTime,
    DEFAULT_ANNOUNCEMENT_TIMES.REQUEST_LP,
  );
  const requestLpRecipient = input.settings.announcementRequestLpRecipient?.trim() || "ma'am";
  const requestLpName = input.settings.announcementRequestLpName?.trim() || "";
  const requestLpLocation =
    input.settings.announcementRequestLpLocation?.trim() || "outside spectrum mess";
  const lastParadeTime = resolveTime(
    input.settings.announcementLastParadeTime,
    DEFAULT_ANNOUNCEMENT_TIMES.LAST_PARADE_1730,
  );
  const lastParadeLocation = input.settings.announcementLastParadeLocation?.trim() || "Under Block 315e";
  const currentAffairReminderTime = DEFAULT_ANNOUNCEMENT_TIMES.CURRENT_AFFAIR_REMINDER;
  const currentAffairSharingTime = DEFAULT_ANNOUNCEMENT_TIMES.CURRENT_AFFAIR_SHARING;
  const { start: currentAffairWeekStart, end: currentAffairWeekEnd } = getCurrentAffairWeekBounds(now);
  const currentAffairDateRange = formatCurrentAffairDateRange(currentAffairWeekStart, currentAffairWeekEnd);
  const morningParadeHref = `/cwc/parade-state?${new URLSearchParams({
    reportType: "Morning",
    reportAt: `${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_MORNING}`,
  }).toString()}`;
  const nightParadeHref = `/cwc/parade-state?${new URLSearchParams({
    reportType: "Night",
    reportAt: `${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_NIGHT}`,
  }).toString()}`;

  const allActions: DashboardNextActionCandidate[] = [
    {
      source: "announcements",
      id: "first-parade",
      title: "First Parade",
      time: firstParadeTime,
      copyText: generateRoutineAnnouncementMessage(input.templateMap.FIRST_PARADE, {
        time: firstParadeTime,
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.FIRST_PARADE}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "parade-state",
      id: "parade-state-morning",
      title: "Parade State (Morning)",
      time: DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_MORNING,
      copyText: generateParadeStateMessage(
        input.morningParadeInput,
        input.templateMap.PARADE_MORNING,
      ),
      href: morningParadeHref,
      hrefLabel: "Go to Parade State",
    },
    {
      source: "announcements",
      id: "pt",
      title: "PT",
      time: ptTime,
      copyText: generateRoutineAnnouncementMessage(input.templateMap.PT, {
        time: ptTime,
        activity: ptActivity,
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.PT}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "current-affairs",
      id: "current-affair-reminder",
      title: "Current Affair Reminder",
      time: currentAffairReminderTime,
      copyText: generateCurrentAffairReminderMessage(input.templateMap.CURRENT_AFFAIR_REMINDER, {
        time: DEFAULT_ANNOUNCEMENT_TIMES.CURRENT_AFFAIR_SHARING,
      }),
      href: `/cwc/current-affairs#${CURRENT_AFFAIR_SECTION_ID}`,
      hrefLabel: "Go to Current Affairs",
    },
    {
      source: "current-affairs",
      id: "current-affair-sharing",
      title: "Current Affair Sharing",
      time: currentAffairSharingTime,
      copyText: generateCurrentAffairSharingMessage(input.templateMap.CURRENT_AFFAIR_SHARING, {
        dateRange: currentAffairDateRange,
        entries: input.currentAffairWeekEntries.map((entry) => ({
          sharingDate: new Date(entry.sharingDate),
          scope: formatCurrentAffairScopeLabel(entry.scope),
          presenter: entry.presenter,
          title: entry.title,
        })),
      }),
      href: `/cwc/current-affairs#${CURRENT_AFFAIR_SECTION_ID}`,
      hrefLabel: "Go to Current Affairs",
    },
    {
      source: "announcements",
      id: "morning-lab",
      title: "Morning Lab",
      time: morningLabTime,
      copyText: generateRoutineAnnouncementMessage(input.templateMap.MORNING_LAB, {
        time: morningLabTime,
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.MORNING_LAB}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "announcements",
      id: "mtr-1030",
      title: "MTR (Lunch)",
      time: mtr1030Time,
      copyText: generateMtrAnnouncementMessage(input.templateMap.MTR_1030, {
        time: mtr1030Time,
        location: input.settings.announcementMtr1030Location ?? "",
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.MTR_1030}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "announcements",
      id: "mtr-1630",
      title: "MTR (Dinner)",
      time: mtr1630Time,
      copyText: generateMtrAnnouncementMessage(input.templateMap.MTR_1630, {
        time: mtr1630Time,
        location: input.settings.announcementMtr1630Location ?? "",
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.MTR_1630}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "announcements",
      id: "request-di-fp",
      title: "Request DI for FP",
      time: requestDiMessageTime,
      copyText: generateRequestDiMessage(input.templateMap.REQUEST_DI_FP, {
        recipient: requestDiRecipient,
        name: requestDiName,
        cohortName: input.cohortName,
        location: requestDiLocation,
        time: requestDiMessageTime,
        firstTime: Boolean(input.settings.announcementRequestDiFirstTime),
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.REQUEST_DI_FP}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "announcements",
      id: "request-lp",
      title: "Request DI for LP",
      time: requestLpMessageTime,
      copyText: generateRequestLpMessage(input.templateMap.REQUEST_LP, {
        recipient: requestLpRecipient,
        name: requestLpName,
        cohortName: input.cohortName,
        location: requestLpLocation,
        time: requestLpMessageTime,
        firstTime: Boolean(input.settings.announcementRequestLpFirstTime),
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.REQUEST_LP}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "announcements",
      id: "last-parade",
      title: "Last Parade",
      time: lastParadeTime,
      copyText: generateLastParadeMessage(input.templateMap.LAST_PARADE_1730, {
        time: lastParadeTime,
        location: lastParadeLocation,
      }),
      href: `/cwc/announcements#${ANNOUNCEMENT_SECTION_IDS.LAST_PARADE_1730}`,
      hrefLabel: "Go to Announcements",
    },
    {
      source: "parade-state",
      id: "parade-state-night",
      title: "Parade State (Night)",
      time: DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_NIGHT,
      copyText: generateParadeStateMessage(
        input.nightParadeInput,
        input.templateMap.PARADE_MORNING,
      ),
      href: nightParadeHref,
      hrefLabel: "Go to Parade State",
    },
  ];

  const upcomingActions = allActions
    .filter((action) => input.hasCurrentAffairToday || action.id !== "current-affair-reminder")
    .filter((action) => input.hasCurrentAffairToday || action.id !== "current-affair-sharing")
    .map((action, index) => ({
      action,
      order: index,
      normalizedTime: normalizeTimeValue(action.time),
    }))
    .filter((entry) => entry.normalizedTime >= normalizeTimeValue(currentTime))
    .sort(
      (left, right) =>
        left.normalizedTime.localeCompare(right.normalizedTime) || left.order - right.order,
    );

  const nextActionBySource = new Map<DashboardActionSource, (typeof upcomingActions)[number]>();

  for (const entry of upcomingActions) {
    if (!nextActionBySource.has(entry.action.source)) {
      nextActionBySource.set(entry.action.source, entry);
    }
  }

  const actions = Array.from(nextActionBySource.values())
    .sort(
      (left, right) =>
        left.normalizedTime.localeCompare(right.normalizedTime) || left.order - right.order,
    )
    .map((entry) => ({
      id: entry.action.id,
      title: entry.action.title,
      time: entry.action.time,
      copyText: entry.action.copyText,
      href: entry.action.href,
      hrefLabel: entry.action.hrefLabel,
    }));

  return {
    currentTime,
    actions,
  };
}
