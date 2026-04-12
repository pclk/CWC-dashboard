import { formatCompactDmy, getSingaporeDayBounds } from "@/lib/date";

export const TRASH_IC_MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

export type TrashIcMeal = (typeof TRASH_IC_MEALS)[number];

export type TrashIcBunk = {
  bunkNumber: number;
  bunkId: string;
  personnel: string[];
};

export type TrashIcAssignment = {
  meal: TrashIcMeal;
  bunk: TrashIcBunk;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function sortBunks(bunks: TrashIcBunk[]) {
  return [...bunks].sort(
    (left, right) => left.bunkNumber - right.bunkNumber || left.bunkId.localeCompare(right.bunkId),
  );
}

function formatPersonnelBlock(personnel: string[]) {
  return personnel.length
    ? personnel.map((person, index) => `${index + 1}) ${person}`).join("\n")
    : "1) NIL";
}

export function buildTrashIcAssignments(input: {
  bunks: TrashIcBunk[];
  yesterdayLastBunkNumber: number;
  targetDate: Date;
  todayDate?: Date;
  havePtToday?: boolean;
}) {
  const bunks = sortBunks(input.bunks);

  if (!bunks.length) {
    return [];
  }

  const yesterdayLastIndex = bunks.findIndex(
    (bunk) => bunk.bunkNumber === input.yesterdayLastBunkNumber,
  );

  if (yesterdayLastIndex === -1) {
    return [];
  }

  const todayStart = getSingaporeDayBounds(input.todayDate ?? new Date()).start.getTime();
  const targetStart = getSingaporeDayBounds(input.targetDate).start.getTime();
  const dayOffset = Math.round((targetStart - todayStart) / DAY_IN_MS);
  const ptImpactsTargetDate = Boolean(input.havePtToday) && dayOffset === 0;
  const targetMeals = ptImpactsTargetDate
    ? (["Lunch", "Dinner"] satisfies TrashIcMeal[])
    : TRASH_IC_MEALS;
  const targetBreakfastIndex = modulo(
    yesterdayLastIndex +
      (Boolean(input.havePtToday) && dayOffset > 0 ? dayOffset * TRASH_IC_MEALS.length : 1 + dayOffset * TRASH_IC_MEALS.length),
    bunks.length,
  );

  return targetMeals.map((meal, mealOffset) => ({
    meal,
    bunk: bunks[modulo(targetBreakfastIndex + mealOffset, bunks.length)],
  }));
}

export function generateTrashIcMessage(input: {
  targetDate: Date;
  assignments: TrashIcAssignment[];
}) {
  if (!input.assignments.length) {
    return `${formatCompactDmy(input.targetDate)} Trash ICs\n\nNIL`;
  }

  return `${formatCompactDmy(input.targetDate)} Trash ICs\n\n${input.assignments
    .map(
      (assignment) =>
        `Bunk ${assignment.bunk.bunkNumber} - ${assignment.meal}\n${formatPersonnelBlock(assignment.bunk.personnel)}`,
    )
    .join("\n\n")}`;
}
