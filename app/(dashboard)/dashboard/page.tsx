import { DueConfirmationList } from "@/components/dashboard/due-confirmation-list";
import { NextActions } from "@/components/dashboard/next-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import { WeeklyTodoList } from "@/components/dashboard/weekly-todo-list";
import { DEFAULT_ANNOUNCEMENT_TIMES, WEEKLY_TODO_SYSTEM_KEYS } from "@/lib/announcement-config";
import { formatCompactDmy, getSingaporeWeekBounds, parseSingaporeInputToUtc } from "@/lib/date";
import { buildDashboardNextActions } from "@/lib/dashboard-next-actions";
import {
  buildParadeStateInput,
  getCurrentAffairSharingsForDay,
  getCurrentAffairSharingsForWeek,
  getDashboardData,
  getSettingsAndTemplates,
  getWeeklyTodos,
} from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const userId = await requireUser();
  const now = new Date();
  const today = formatCompactDmy(now);
  const morningReportAt =
    parseSingaporeInputToUtc(`${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_MORNING}`) ?? now;
  const nightReportAt =
    parseSingaporeInputToUtc(`${today} ${DEFAULT_ANNOUNCEMENT_TIMES.PARADE_STATE_NIGHT}`) ?? now;
  const { start: weekStart } = getSingaporeWeekBounds(now);
  const [
    { summary, dueConfirmations, todayAppointments },
    settingsBundle,
    morningParadeInput,
    nightParadeInput,
    weeklyTodos,
    currentAffairWeek,
    currentAffairToday,
  ] =
    await Promise.all([
      getDashboardData(userId),
      getSettingsAndTemplates(userId),
      buildParadeStateInput(userId, {
        reportType: "Morning",
        reportAt: morningReportAt,
      }),
      buildParadeStateInput(userId, {
        reportType: "Night",
        reportAt: nightReportAt,
      }),
      getWeeklyTodos(userId),
      getCurrentAffairSharingsForWeek(userId, now),
      getCurrentAffairSharingsForDay(userId, now),
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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Operations Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Surface only the operational items that need attention now. The next actions below are
          generated from your current templates, draft timings, and roster state.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Strength"
          value={`${summary.presentStrength}/${summary.totalStrength}`}
        />
        <StatCard label="Needs Confirmation" value={`${dueConfirmations.length}`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DueConfirmationList records={dueConfirmations} />
        <TodayAppointments appointments={todayAppointments} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <NextActions currentTime={nextActions.currentTime} actions={nextActions.actions} />
        <WeeklyTodoList items={weeklyTodoItems} />
      </section>
    </div>
  );
}
