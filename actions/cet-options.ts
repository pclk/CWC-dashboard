"use server";

import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { CetUnauthorizedError, requireCetEditor } from "@/lib/cet-auth";
import { prisma } from "@/lib/prisma";
import {
  cetAttireDeleteSchema,
  cetAttireUpsertSchema,
  cetVenueDeleteSchema,
  cetVenueUpsertSchema,
} from "@/lib/validators/cet";

export type CetVenueOption = {
  id: string;
  name: string;
  active: boolean;
};

export type CetAttireOption = {
  id: string;
  name: string;
  active: boolean;
};

function revalidateCetSurfaces() {
  revalidatePath("/cwc/cet");
  revalidatePath("/cwc/dashboard");
  revalidatePath("/cwc/instructors");
  revalidatePath("/cadet/dashboard");
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function getCetVenues(): Promise<CetVenueOption[]> {
  const editor = await requireCetEditor();

  const venues = await prisma.cetVenue.findMany({
    where: { userId: editor.userId, active: true },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });

  return venues;
}

export async function createCetVenueAction(input: {
  id?: string;
  name: string;
}): Promise<ActionResult & { venue?: CetVenueOption }> {
  let editor;

  try {
    editor = await requireCetEditor();
  } catch (error) {
    if (error instanceof CetUnauthorizedError) {
      return failure(error.message);
    }
    throw error;
  }

  const parsed = cetVenueUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid venue input.");
  }

  const name = parsed.data.name;

  try {
    if (parsed.data.id) {
      const existing = await prisma.cetVenue.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, userId: true },
      });

      if (!existing || existing.userId !== editor.userId) {
        return failure("Venue not found.");
      }

      const venue = await prisma.cetVenue.update({
        where: { id: parsed.data.id },
        data: { name, active: true },
        select: { id: true, name: true, active: true },
      });

      revalidateCetSurfaces();
      return { ...success("Venue updated."), venue };
    }

    const venue = await prisma.cetVenue.upsert({
      where: { userId_name: { userId: editor.userId, name } },
      create: { userId: editor.userId, name },
      update: { active: true },
      select: { id: true, name: true, active: true },
    });

    revalidateCetSurfaces();
    return { ...success("Venue saved."), venue };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return failure("A venue with that name already exists.");
    }
    throw error;
  }
}

export async function deleteCetVenueAction(input: {
  venueId: string;
}): Promise<ActionResult> {
  let editor;

  try {
    editor = await requireCetEditor();
  } catch (error) {
    if (error instanceof CetUnauthorizedError) {
      return failure(error.message);
    }
    throw error;
  }

  const parsed = cetVenueDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid venue selection.");
  }

  const updated = await prisma.cetVenue.updateMany({
    where: {
      id: parsed.data.venueId,
      userId: editor.userId,
      active: true,
    },
    data: { active: false },
  });

  if (updated.count === 0) {
    return failure("Venue not found or already removed.");
  }

  revalidateCetSurfaces();
  return success("Venue removed.");
}

export async function getCetAttireOptions(): Promise<CetAttireOption[]> {
  const editor = await requireCetEditor();

  const attire = await prisma.cetAttire.findMany({
    where: { userId: editor.userId, active: true },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });

  return attire;
}

export async function createCetAttireAction(input: {
  id?: string;
  name: string;
}): Promise<ActionResult & { attire?: CetAttireOption }> {
  let editor;

  try {
    editor = await requireCetEditor();
  } catch (error) {
    if (error instanceof CetUnauthorizedError) {
      return failure(error.message);
    }
    throw error;
  }

  const parsed = cetAttireUpsertSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid attire input.");
  }

  const name = parsed.data.name;

  try {
    if (parsed.data.id) {
      const existing = await prisma.cetAttire.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, userId: true },
      });

      if (!existing || existing.userId !== editor.userId) {
        return failure("Attire option not found.");
      }

      const attire = await prisma.cetAttire.update({
        where: { id: parsed.data.id },
        data: { name, active: true },
        select: { id: true, name: true, active: true },
      });

      revalidateCetSurfaces();
      return { ...success("Attire option updated."), attire };
    }

    const attire = await prisma.cetAttire.upsert({
      where: { userId_name: { userId: editor.userId, name } },
      create: { userId: editor.userId, name },
      update: { active: true },
      select: { id: true, name: true, active: true },
    });

    revalidateCetSurfaces();
    return { ...success("Attire option saved."), attire };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return failure("An attire option with that name already exists.");
    }
    throw error;
  }
}

export async function deleteCetAttireAction(input: {
  attireId: string;
}): Promise<ActionResult> {
  let editor;

  try {
    editor = await requireCetEditor();
  } catch (error) {
    if (error instanceof CetUnauthorizedError) {
      return failure(error.message);
    }
    throw error;
  }

  const parsed = cetAttireDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid attire selection.");
  }

  const updated = await prisma.cetAttire.updateMany({
    where: {
      id: parsed.data.attireId,
      userId: editor.userId,
      active: true,
    },
    data: { active: false },
  });

  if (updated.count === 0) {
    return failure("Attire option not found or already removed.");
  }

  revalidateCetSurfaces();
  return success("Attire option removed.");
}
