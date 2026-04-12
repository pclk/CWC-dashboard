"use server";

import { failure, parseOptionalString, revalidateOperationalPages, success, type ActionResult } from "@/actions/helpers";
import { parseSingaporeLooseDateInputToUtc } from "@/lib/date";
import { assertDutyInstructorOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  dutyInstructorBulkDeleteSchema,
  dutyInstructorDeleteSchema,
  dutyInstructorSchema,
} from "@/lib/validators/duty-instructor";

type ParsedDutyInstructorEntry =
  | {
      ok: true;
      dutyDate: Date;
      rank: string;
      name: string;
      reserve: string | null;
    }
  | {
      ok: false;
      error: string;
    };

type ParsedDutyInstructorIdentity =
  | {
      ok: true;
      rank: string;
      name: string;
    }
  | {
      ok: false;
      error: string;
    };

function parseDutyInstructorActiveText(activeText: string): ParsedDutyInstructorIdentity {
  const parts = activeText.split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return {
      ok: false,
      error: "Active is required.",
    };
  }

  if (parts.length === 1) {
    return {
      ok: true,
      rank: "",
      name: parts[0],
    };
  }

  return {
    ok: true,
    rank: parts[0],
    name: parts.slice(1).join(" "),
  };
}

function parseDutyInstructorEntryLine(entryText: string): ParsedDutyInstructorEntry {
  const segments = entryText
    .split(/\s+-\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2 || segments.length > 3) {
    return {
      ok: false,
      error: "Use `Date - Rank Name - Optional Reserve`.",
    };
  }

  const [dutyDateText, activeText, reserveText] = segments;

  let dutyDate: Date | null;

  try {
    dutyDate = parseSingaporeLooseDateInputToUtc(dutyDateText);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid duty date.",
    };
  }

  if (!dutyDate) {
    return {
      ok: false,
      error: "Duty date is required.",
    };
  }

  const parsedActive = parseDutyInstructorActiveText(activeText);

  if (!parsedActive.ok) {
    return parsedActive;
  }

  return {
    ok: true,
    dutyDate,
    rank: parsedActive.rank,
    name: parsedActive.name,
    reserve: reserveText || null,
  };
}

export async function upsertDutyInstructorAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = dutyInstructorSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    mode: parseOptionalString(formData.get("mode")),
    entryText: parseOptionalString(formData.get("entryText")),
    dutyDate: parseOptionalString(formData.get("dutyDate")),
    active: parseOptionalString(formData.get("active")),
    reserve: parseOptionalString(formData.get("reserve")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid duty instructor entry.");
  }

  const parsedEntries =
    parsed.data.mode === "text"
      ? (parsed.data.entryText ?? "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => {
            const result = parseDutyInstructorEntryLine(line);

            if (!result.ok) {
              return {
                ok: false as const,
                error: `Line ${index + 1}: ${result.error}`,
              };
            }

            return result;
          })
      : (() => {
          let dutyDate: Date | null;

          try {
            dutyDate = parseSingaporeLooseDateInputToUtc(parsed.data.dutyDate);
          } catch (error) {
            return [
              {
                ok: false as const,
                error: error instanceof Error ? error.message : "Invalid duty date.",
              },
            ];
          }

          if (!dutyDate) {
            return [
              {
                ok: false as const,
                error: "Duty date is required.",
              },
            ];
          }

          const parsedActive = parseDutyInstructorActiveText(parsed.data.active ?? "");

          if (!parsedActive.ok) {
            return [parsedActive];
          }

          return [
            {
              ok: true as const,
              dutyDate,
              rank: parsedActive.rank,
              name: parsedActive.name,
              reserve: parsed.data.reserve || null,
            },
          ];
        })();

  const invalidEntry = parsedEntries.find((entry) => !entry.ok);

  if (invalidEntry && !invalidEntry.ok) {
    return failure(invalidEntry.error);
  }

  const entries = parsedEntries.filter((entry): entry is Extract<ParsedDutyInstructorEntry, { ok: true }> => entry.ok);

  if (parsed.data.id && entries.length !== 1) {
    return failure("Editing supports exactly one duty instructor entry.");
  }

  try {
    if (parsed.data.id) {
      await assertDutyInstructorOwnership(userId, parsed.data.id);
      await prisma.dutyInstructor.update({
        where: { id: parsed.data.id },
        data: {
          dutyDate: entries[0].dutyDate,
          rank: entries[0].rank,
          name: entries[0].name,
          reserve: entries[0].reserve,
        },
      });
    } else {
      await prisma.$transaction(
        entries.map((entry) =>
          prisma.dutyInstructor.create({
            data: {
              userId,
              dutyDate: entry.dutyDate,
              rank: entry.rank,
              name: entry.name,
              reserve: entry.reserve,
            },
          }),
        ),
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string" &&
      (error as { code?: string }).code === "P2002"
    ) {
      return failure("A duty instructor entry already exists for that date.");
    }

    throw error;
  }

  revalidateOperationalPages();
  return success(
    parsed.data.id
      ? "Duty instructor updated."
      : entries.length === 1
        ? "Duty instructor created."
        : `${entries.length} duty instructor entries created.`,
  );
}

export async function deleteDutyInstructorAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = dutyInstructorDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid duty instructor entry.");
  }

  await assertDutyInstructorOwnership(userId, parsed.data.id);
  await prisma.dutyInstructor.delete({
    where: { id: parsed.data.id },
  });

  revalidateOperationalPages();
  return success("Duty instructor deleted.");
}

export async function bulkDeleteDutyInstructorsAction(input: {
  ids: string[];
}): Promise<ActionResult> {
  const userId = await requireUser();
  const parsed = dutyInstructorBulkDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid duty instructor selection.");
  }

  const ids = [...new Set(parsed.data.ids)];
  let deletedCount = 0;

  try {
    deletedCount = await prisma.$transaction(async (tx) => {
      const ownedCount = await tx.dutyInstructor.count({
        where: {
          userId,
          id: {
            in: ids,
          },
        },
      });

      if (ownedCount !== ids.length) {
        throw new Error("Duty instructor entry not found");
      }

      const deleted = await tx.dutyInstructor.deleteMany({
        where: {
          userId,
          id: {
            in: ids,
          },
        },
      });

      return deleted.count;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Duty instructor entry not found") {
      return failure("One or more selected duty instructor entries could not be found.");
    }

    throw error;
  }

  revalidateOperationalPages();
  return success(
    deletedCount === 1 ? "Duty instructor deleted." : `${deletedCount} duty instructor entries deleted.`,
  );
}
