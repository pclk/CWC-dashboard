import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DueConfirmationList } from "@/components/dashboard/due-confirmation-list";
import { NextActions } from "@/components/dashboard/next-actions";
import { StrengthPieChart } from "@/components/dashboard/strength-pie-chart";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import { WeeklyTodoList } from "@/components/dashboard/weekly-todo-list";
import { DEFAULT_ANNOUNCEMENT_TIMES, WEEKLY_TODO_SYSTEM_KEYS } from "@/lib/announcement-config";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import {
  formatCompactDmy,
  getSingaporeDayBounds,
  getSingaporeWeekBounds,
  parseSingaporeInputToUtc,
} from "@/lib/date";
import { buildDashboardNextActions } from "@/lib/dashboard-next-actions";
import {
  buildDashboardStrengthBuckets,
  buildDashboardTimeline,
} from "@/lib/dashboard-insights";
import {
  buildParadeStateInput,
  getCurrentAffairSharingsForDay,
  getCurrentAffairSharingsForWeek,
  getActiveCadets,
  getOperationalRecords,
  getRecordsNeedingConfirmation,
  getUpcomingAppointments,
  getSettingsAndTemplates,
  getWeeklyTodos,
} from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const now = new Date();
    const today = formatCompactDmy(now);
    const morningReportAt =
      parseSingaporeInputToUtc(`${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_MORNING}`) ??
      now;
    const nightReportAt =
      parseSingaporeInputToUtc(`${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_NIGHT}`) ?? now;
    const { start: weekStart } = getSingaporeWeekBounds(now);
    const todayBounds = getSingaporeDayBounds(now);
    const [
      dueConfirmations,
      todayAppointments,
      settingsBundle,
      morningParadeInput,
      nightParadeInput,
      currentParadeInput,
      weeklyTodos,
      currentAffairWeek,
      currentAffairToday,
      activeCadets,
      operationalRecords,
    ] = await Promise.all([
      getRecordsNeedingConfirmation(userId),
      getUpcomingAppointments(userId, todayBounds.start, todayBounds.end),
      getSettingsAndTemplates(userId),
      buildParadeStateInput(userId, {
        reportType: "Morning",
        reportAt: morningReportAt,
      }),
      buildParadeStateInput(userId, {
        reportType: "Night",
        reportAt: nightReportAt,
      }),
      buildParadeStateInput(userId, {
        reportType: "Custom",
        reportAt: now,
      }),
      getWeeklyTodos(userId),
      getCurrentAffairSharingsForWeek(userId, now),
      getCurrentAffairSharingsForDay(userId, now),
      getActiveCadets(userId),
      getOperationalRecords(userId),
    ]);
    const weeklyTodoItems = weeklyTodos.map((todo) => {
      const isCurrentWeekComplete = todo.completedWeekStart?.getTime() === weekStart.getTime();
      const isCurrentAffairTodo = todo.systemKey === WEEKLY_TODO_SYSTEM_KEYS.CA_SHARING;
      const currentAffairCompleted = currentAffairWeek.length >= 2;

      return {
        id: todo.id,
        title: todo.title,
        systemKey: todo.systemKey,
        completed: isCurrentAffairTodo ? currentAffairCompleted : isCurrentWeekComplete,
        canToggle: !isCurrentAffairTodo,
        canDelete: !todo.systemKey,
        helperText: isCurrentAffairTodo
          ? `Auto-tracked from current affair sharings: ${currentAffairWeek.length}/2 this week.`
          : undefined,
      };
    });
    const nextActions = buildDashboardNextActions({
      now,
      settings: settingsBundle.settings,
      templateMap: settingsBundle.templateMap,
      morningParadeInput,
      nightParadeInput,
      cohortName: settingsBundle.settings.unitName,
      hasCurrentAffairToday: currentAffairToday.length > 0,
      currentAffairWeekEntries: currentAffairWeek,
    });
    const strengthBuckets = buildDashboardStrengthBuckets({
      activeCadets,
      operationalRecords,
      todayAppointments,
      now,
    });
    const timelineEvents = buildDashboardTimeline({
      activeCadets,
      operationalRecords,
      upcomingAppointments: currentParadeInput.upcomingAppointments,
      now,
    });

    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Operations Overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Surface only the operational items that need attention now. The next actions below are
            generated from your current templates, draft timings, and roster state.
          </p>
        </section>

        <StrengthPieChart buckets={strengthBuckets} />

        <section className="grid gap-4 lg:grid-cols-2">
          <DueConfirmationList records={dueConfirmations} />
          <TodayAppointments appointments={todayAppointments} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
          <NextActions currentTime={nextActions.currentTime} actions={nextActions.actions} />
          <WeeklyTodoList items={weeklyTodoItems} />
        </section>

        <ActivityTimeline events={timelineEvents} />
      </div>
    );
  });
}
