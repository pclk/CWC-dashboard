import { TemplateType } from "@prisma/client";

import {
  ANNOUNCEMENT_SECTION_IDS,
  CURRENT_AFFAIR_SECTION_ID,
  DEFAULT_ANNOUNCEMENT_TIMES,
} from "@/lib/announcement-config";
import { formatCompactDmy, formatTimeText } from "@/lib/date";
import {
  generateCurrentAffairReminderMessage,
} from "@/lib/generators/current-affairs";
import {
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
  announcementRequestDiRank?: string | null;
  announcementRequestDiName?: string | null;
  announcementRequestDiLocation?: string | null;
  announcementRequestDiTime?: string | null;
  announcementRequestDiFirstTime?: boolean;
  announcementRequestLpRecipient?: string | null;
  announcementRequestLpLocation?: string | null;
  announcementRequestLpTime?: string | null;
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

export function buildDashboardNextActions(input: {
  now?: Date;
  settings: DashboardActionSettings;
  templateMap: Record<TemplateType, string>;
  morningParadeInput: ParadeStateInput;
  nightParadeInput: ParadeStateInput;
  cohortName: string;
  hasCurrentAffairToday: boolean;
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
  const requestDiRank = input.settings.announcementRequestDiRank?.trim() || "";
  const requestDiName = input.settings.announcementRequestDiName?.trim() || "";
  const requestDiLocation = input.settings.announcementRequestDiLocation?.trim() || "under block 315e";
  const requestLpMessageTime = resolveTime(
    input.settings.announcementRequestLpTime,
    DEFAULT_ANNOUNCEMENT_TIMES.REQUEST_LP,
  );
  const requestLpRecipient = input.settings.announcementRequestLpRecipient?.trim() || "ma'am";
  const requestLpLocation =
    input.settings.announcementRequestLpLocation?.trim() || "outside spectrum mess";
  const currentAffairReminderTime = DEFAULT_ANNOUNCEMENT_TIMES.CURRENT_AFFAIR_REMINDER;
  const morningParadeHref = `/parade-state?${new URLSearchParams({
    reportType: "Morning",
    reportAt: `${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_MORNING}`,
    reportTimeLabel: "Morning",
  }).toString()}`;
  const nightParadeHref = `/parade-state?${new URLSearchParams({
    reportType: "Night",
    reportAt: `${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_NIGHT}`,
    reportTimeLabel: "Night",
  }).toString()}`;

  const allActions: DashboardNextAction[] = [
    {
      id: "first-parade",
      title: "First Parade",
      time: firstParadeTime,
      copyText: generateRoutineAnnouncementMessage(input.templateMap.FIRST_PARADE, {
        time: firstParadeTime,
      }),
      href: `/announcements#${ANNOUNCEMENT_SECTION_IDS.FIRST_PARADE}`,
      hrefLabel: "Go to Announcements",
    },
    {
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
      id: "pt",
      title: "PT",
      time: ptTime,
      copyText: generateRoutineAnnouncementMessage(input.templateMap.PT, {
        time: ptTime,
        activity: ptActivity,
      }),
      href: `/announcements#${ANNOUNCEMENT_SECTION_IDS.PT}`,
      hrefLabel: "Go to Announcements",
    },
    {
      id: "current-affair-reminder",
      title: "Current Affair Reminder",
      time: currentAffairReminderTime,
      copyText: generateCurrentAffairReminderMessage(input.templateMap.CURRENT_AFFAIR_REMINDER, {
        time: DEFAULT_ANNOUNCEMENT_TIMES.CURRENT_AFFAIR_SHARING,
      }),
      href: `/announcements#${CURRENT_AFFAIR_SECTION_ID}`,
      hrefLabel: "Go to Announcements",
    },
    {
      id: "morning-lab",
      title: "Morning Lab",
      time: morningLabTime,
      copyText: generateRoutineAnnouncementMessage(input.templateMap.MORNING_LAB, {
        time: morningLabTime,
      }),
      href: `/announcements#${ANNOUNCEMENT_SECTION_IDS.MORNING_LAB}`,
      hrefLabel: "Go to Announcements",
    },
    {
      id: "mtr-1030",
      title: "MTR (Lunch)",
      time: mtr1030Time,
      copyText: generateMtrAnnouncementMessage(input.templateMap.MTR_1030, {
        time: mtr1030Time,
        location: input.settings.announcementMtr1030Location ?? "",
      }),
      href: `/announcements#${ANNOUNCEMENT_SECTION_IDS.MTR_1030}`,
      hrefLabel: "Go to Announcements",
    },
    {
      id: "mtr-1630",
      title: "MTR (Dinner)",
      time: mtr1630Time,
      copyText: generateMtrAnnouncementMessage(input.templateMap.MTR_1630, {
        time: mtr1630Time,
        location: input.settings.announcementMtr1630Location ?? "",
      }),
      href: `/announcements#${ANNOUNCEMENT_SECTION_IDS.MTR_1630}`,
      hrefLabel: "Go to Announcements",
    },
    {
      id: "request-di-fp",
      title: "Request DI for FP",
      time: requestDiMessageTime,
      copyText: generateRequestDiMessage(input.templateMap.REQUEST_DI_FP, {
        recipient: requestDiRecipient,
        rank: requestDiRank,
        name: requestDiName,
        cohortName: input.cohortName,
        location: requestDiLocation,
        time: requestDiMessageTime,
        firstTime: Boolean(input.settings.announcementRequestDiFirstTime),
      }),
      href: `/announcements#${ANNOUNCEMENT_SECTION_IDS.REQUEST_DI_FP}`,
      hrefLabel: "Go to Announcements",
    },
    {
      id: "request-lp",
      title: "Request DI for LP",
      time: requestLpMessageTime,
      copyText: generateRequestLpMessage(input.templateMap.REQUEST_LP, {
        recipient: requestLpRecipient,
        location: requestLpLocation,
        time: requestLpMessageTime,
      }),
      href: `/announcements#${ANNOUNCEMENT_SECTION_IDS.REQUEST_LP}`,
      hrefLabel: "Go to Announcements",
    },
    {
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

  const actions = allActions
    .filter((action) => input.hasCurrentAffairToday || action.id !== "current-affair-reminder")
    .map((action, index) => ({
      ...action,
      order: index,
      time: normalizeTimeValue(action.time),
    }))
    .filter((action) => action.time >= normalizeTimeValue(currentTime))
    .sort((left, right) => left.time.localeCompare(right.time) || left.order - right.order)
    .slice(0, 3);

  return {
    currentTime,
    actions,
  };
}
