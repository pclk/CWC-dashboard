"use server";

import { failure, parseCheckbox, parseOptionalString, success, type ActionResult } from "@/actions/helpers";
import { getSingaporeWeekBounds } from "@/lib/date";
import { assertWeeklyTodoOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  weeklyTodoCreateSchema,
  weeklyTodoDeleteSchema,
  weeklyTodoToggleSchema,
} from "@/lib/validators/weekly-todo";
import { revalidatePath } from "next/cache";

function revalidateWeeklyTodoViews() {
  revalidatePath("/cwc/dashboard");
}

export async function createWeeklyTodoAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = weeklyTodoCreateSchema.safeParse({
    title: parseOptionalString(formData.get("title")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid weekly todo.");
  }

  const highestSortOrder = await prisma.weeklyTodo.findFirst({
    where: { userId },
    orderBy: [{ sortOrder: "desc" }],
    select: { sortOrder: true },
  });

  await prisma.weeklyTodo.create({
    data: {
      userId,
      title: parsed.data.title,
      sortOrder: (highestSortOrder?.sortOrder ?? 0) + 1,
    },
  });

  revalidateWeeklyTodoViews();
  return success("Weekly todo created.");
}

export async function toggleWeeklyTodoAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = weeklyTodoToggleSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
    completed: parseCheckbox(formData.get("completed")),
  });

  if (!parsed.success) {
    return failure("Invalid weekly todo.");
  }

  await assertWeeklyTodoOwnership(userId, parsed.data.id);
  const { start } = getSingaporeWeekBounds();

  await prisma.weeklyTodo.update({
    where: { id: parsed.data.id },
    data: {
      completedWeekStart: parsed.data.completed ? start : null,
    },
  });

  revalidateWeeklyTodoViews();
  return success("Weekly todo updated.");
}

export async function deleteWeeklyTodoAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = weeklyTodoDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid weekly todo.");
  }

  const todo = await prisma.weeklyTodo.findFirst({
    where: { id: parsed.data.id, userId },
    select: { id: true, systemKey: true },
  });

  if (!todo) {
    return failure("Weekly todo not found.");
  }

  if (todo.systemKey) {
    return failure("Default weekly todos cannot be deleted.");
  }

  await prisma.weeklyTodo.delete({
    where: { id: parsed.data.id },
  });

  revalidateWeeklyTodoViews();
  return success("Weekly todo deleted.");
}
