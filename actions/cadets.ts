"use server";

import type { Prisma } from "@prisma/client";

import { failure, parseCheckbox, parseNumber, parseOptionalString, revalidateOperationalPages, success, type ActionResult } from "@/actions/helpers";
import { parseCadetCsv, type ParsedCadetCsvRow } from "@/lib/cadet-csv";
import { assertCadetOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cadetDeleteSchema, cadetSchema } from "@/lib/validators/cadet";

export async function upsertCadetAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = cadetSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    displayName: parseOptionalString(formData.get("displayName")),
    shorthand: parseOptionalString(formData.get("shorthand")),
    active: parseCheckbox(formData.get("active")),
    sortOrder: parseNumber(formData.get("sortOrder")),
    notes: parseOptionalString(formData.get("notes")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid cadet payload.");
  }

  if (parsed.data.id) {
    await assertCadetOwnership(userId, parsed.data.id);

    await prisma.cadet.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        displayName: parsed.data.displayName,
        shorthand: parsed.data.shorthand || null,
        active: parsed.data.active,
        sortOrder: parsed.data.sortOrder,
        notes: parsed.data.notes || null,
      },
    });
  } else {
    await prisma.cadet.create({
      data: {
        userId,
        displayName: parsed.data.displayName,
        shorthand: parsed.data.shorthand || null,
        active: parsed.data.active,
        sortOrder: parsed.data.sortOrder,
        notes: parsed.data.notes || null,
      },
    });
  }

  revalidateOperationalPages();
  return success(parsed.data.id ? "Cadet updated." : "Cadet created.");
}

export async function deleteCadetAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = cadetDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid cadet.");
  }

  await assertCadetOwnership(userId, parsed.data.id);

  await prisma.cadet.delete({
    where: {
      id: parsed.data.id,
    },
  });

  revalidateOperationalPages();
  return success("Cadet deleted.");
}

export async function importCadetsCsvAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return failure("Choose a CSV file to import.");
  }

  const csvText = await file.text();
  let rows: ParsedCadetCsvRow[];

  try {
    rows = parseCadetCsv(csvText);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unable to read the CSV file.");
  }

  if (rows.length === 0) {
    return failure("The CSV file did not contain any cadets.");
  }

  try {
    const { createdCount, updatedCount } = await prisma.$transaction((tx) =>
      importCadetRows(tx, userId, rows),
    );

    revalidateOperationalPages();
    return success(
      `Imported ${rows.length} cadet${rows.length === 1 ? "" : "s"}. Created ${createdCount}, updated ${updatedCount}.`,
    );
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Unable to import cadets.");
  }
}

type CadetIdentity = {
  id: string;
  displayName: string;
};

async function importCadetRows(tx: Prisma.TransactionClient, userId: string, rows: ParsedCadetCsvRow[]) {
  const existingCadets = await tx.cadet.findMany({
    where: { userId },
    select: {
      id: true,
      displayName: true,
    },
  });

  const cadetsByDisplayName = new Map<string, CadetIdentity>();
  const seenDisplayNames = new Map<string, number>();
  let createdCount = 0;
  let updatedCount = 0;

  for (const cadet of existingCadets) {
    addIdentity(cadetsByDisplayName, cadet.displayName, cadet);
  }

  for (const row of rows) {
    trackDuplicateRowValue(seenDisplayNames, row.displayName, row.lineNumber);
  }

  for (const row of rows) {
    const existingCadet = cadetsByDisplayName.get(row.displayName);

    if (existingCadet) {
      const previousDisplayName = existingCadet.displayName;

      await tx.cadet.update({
        where: {
          id: existingCadet.id,
        },
        data: buildCadetData(row),
      });

      cadetsByDisplayName.delete(previousDisplayName);

      const nextIdentity = {
        id: existingCadet.id,
        displayName: row.displayName,
      };

      addIdentity(cadetsByDisplayName, nextIdentity.displayName, nextIdentity);
      updatedCount += 1;
      continue;
    }

    const createdCadet = await tx.cadet.create({
      data: {
        userId,
        ...buildCadetData(row),
      },
      select: {
        id: true,
        displayName: true,
      },
    });

    addIdentity(cadetsByDisplayName, createdCadet.displayName, createdCadet);
    createdCount += 1;
  }

  return {
    createdCount,
    updatedCount,
  };
}

function buildCadetData(row: ParsedCadetCsvRow) {
  return {
    displayName: row.displayName,
    shorthand: row.shorthand || null,
    active: row.active,
    sortOrder: row.sortOrder,
    notes: row.notes || null,
  };
}

function addIdentity(store: Map<string, CadetIdentity>, value: string | null | undefined, cadet: CadetIdentity) {
  if (!value) {
    return;
  }

  const existingCadet = store.get(value);

  if (existingCadet && existingCadet.id !== cadet.id) {
    throw new Error(`Multiple existing cadets share displayName "${value}". Resolve that duplicate before importing.`);
  }

  store.set(value, cadet);
}

function trackDuplicateRowValue(seenValues: Map<string, number>, value: string | undefined, lineNumber: number) {
  if (!value) {
    return;
  }

  const previousLineNumber = seenValues.get(value);

  if (previousLineNumber) {
    throw new Error(`CSV contains duplicate displayName "${value}" on lines ${previousLineNumber} and ${lineNumber}.`);
  }

  seenValues.set(value, lineNumber);
}
