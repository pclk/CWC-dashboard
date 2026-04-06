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
  todayBreakfastBunkNumber: number;
  targetDate: Date;
  todayDate?: Date;
}) {
  const bunks = sortBunks(input.bunks);

  if (!bunks.length) {
    return [];
  }

  const breakfastIndex = bunks.findIndex(
    (bunk) => bunk.bunkNumber === input.todayBreakfastBunkNumber,
  );

  if (breakfastIndex === -1) {
    return [];
  }

  const todayStart = getSingaporeDayBounds(input.todayDate ?? new Date()).start.getTime();
  const targetStart = getSingaporeDayBounds(input.targetDate).start.getTime();
  const dayOffset = Math.round((targetStart - todayStart) / DAY_IN_MS);
  const targetBreakfastIndex = modulo(
    breakfastIndex + dayOffset * TRASH_IC_MEALS.length,
    bunks.length,
  );

  return TRASH_IC_MEALS.map((meal, mealOffset) => ({
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
