"use server";

import { revalidatePath } from "next/cache";

import { failure, type ActionResult } from "@/actions/helpers";
import { getCadetSession } from "@/lib/cadet-auth";
import { getSingaporeDayBounds } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  cadetNightStudyChoiceSchema,
  type CadetNightStudyChoiceInput,
  type CadetNightStudyChoiceValue,
} from "@/lib/validators/night-study";

export type CadetNightStudyTodayChoice = {
  choice: CadetNightStudyChoiceValue;
  updatedAt: string;
};

export type CadetNightStudyChoiceContext = {
  todayChoice: CadetNightStudyTodayChoice | null;
  defaultChoice: CadetNightStudyTodayChoice | null;
};

export async function getMyNightStudyChoiceForToday(): Promise<CadetNightStudyTodayChoice | null> {
  const session = await getCadetSession();

  if (!session) {
    return null;
  }

  const { start, end } = getSingaporeDayBounds();

  const record = await prisma.cadetNightStudyChoice.findFirst({
    where: {
      cadetId: session.cadetId,
      userId: session.userId,
      date: { gte: start, lte: end },
    },
    select: { choice: true, updatedAt: true },
  });

  if (!record) {
    return null;
  }

  return {
    choice: record.choice as CadetNightStudyChoiceValue,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getMyNightStudyChoiceContext(): Promise<CadetNightStudyChoiceContext> {
  const session = await getCadetSession();

  if (!session) {
    return { todayChoice: null, defaultChoice: null };
  }

  const { start, end } = getSingaporeDayBounds();

  const [today, previous] = await Promise.all([
    prisma.cadetNightStudyChoice.findFirst({
      where: {
        cadetId: session.cadetId,
        userId: session.userId,
        date: { gte: start, lte: end },
      },
      select: { choice: true, updatedAt: true },
    }),
    prisma.cadetNightStudyChoice.findFirst({
      where: {
        cadetId: session.cadetId,
        userId: session.userId,
        date: { lt: start },
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      select: { choice: true, updatedAt: true },
    }),
  ]);

  const todayChoice = today
    ? {
        choice: today.choice as CadetNightStudyChoiceValue,
        updatedAt: today.updatedAt.toISOString(),
      }
    : null;
  const previousChoice = previous
    ? {
        choice: previous.choice as CadetNightStudyChoiceValue,
        updatedAt: previous.updatedAt.toISOString(),
      }
    : null;

  return {
    todayChoice,
    defaultChoice: todayChoice ?? previousChoice,
  };
}

export async function setMyNightStudyChoiceForToday(
  input: CadetNightStudyChoiceInput,
): Promise<ActionResult & { choice?: CadetNightStudyTodayChoice }> {
  const parsed = cadetNightStudyChoiceSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid choice.");
  }

  const session = await getCadetSession();

  if (!session) {
    return failure("Cadet session expired. Sign in again.");
  }

  const { start, end } = getSingaporeDayBounds();

  const existing = await prisma.cadetNightStudyChoice.findFirst({
    where: {
      cadetId: session.cadetId,
      userId: session.userId,
      date: { gte: start, lte: end },
    },
    select: { id: true },
  });

  const saved = existing
    ? await prisma.cadetNightStudyChoice.update({
        where: { id: existing.id },
        data: { choice: parsed.data.choice },
        select: { choice: true, updatedAt: true },
      })
    : await prisma.cadetNightStudyChoice.create({
        data: {
          userId: session.userId,
          cadetId: session.cadetId,
          date: start,
          choice: parsed.data.choice,
        },
        select: { choice: true, updatedAt: true },
      });

  revalidatePath("/cadet/night-study");
  revalidatePath("/cadet/dashboard");
  revalidatePath("/cwc/night-study");

  return {
    ok: true,
    message: "Choice saved.",
    choice: {
      choice: saved.choice as CadetNightStudyChoiceValue,
      updatedAt: saved.updatedAt.toISOString(),
    },
  };
}
