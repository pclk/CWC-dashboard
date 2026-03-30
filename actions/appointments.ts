"use server";

import { failure, parseCheckbox, parseOptionalString, revalidateOperationalPages, success, type ActionResult } from "@/actions/helpers";
import { parseSingaporeInputToUtc } from "@/lib/date";
import { assertAppointmentOwnership, assertCadetOwnership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { appointmentDeleteSchema, appointmentSchema } from "@/lib/validators/appointment";

export async function upsertAppointmentAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = appointmentSchema.safeParse({
    id: parseOptionalString(formData.get("id")) || undefined,
    cadetId: parseOptionalString(formData.get("cadetId")),
    title: parseOptionalString(formData.get("title")),
    venue: parseOptionalString(formData.get("venue")),
    appointmentAt: parseOptionalString(formData.get("appointmentAt")),
    notes: parseOptionalString(formData.get("notes")),
    completed: parseCheckbox(formData.get("completed")),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid appointment payload.");
  }

  await assertCadetOwnership(userId, parsed.data.cadetId);
  const appointmentAt = parseSingaporeInputToUtc(parsed.data.appointmentAt);

  if (!appointmentAt) {
    return failure("Appointment date and time are required.");
  }

  if (parsed.data.id) {
    await assertAppointmentOwnership(userId, parsed.data.id);

    await prisma.appointment.update({
      where: {
        id: parsed.data.id,
      },
      data: {
        cadetId: parsed.data.cadetId,
        title: parsed.data.title,
        venue: parsed.data.venue || null,
        appointmentAt,
        notes: parsed.data.notes || null,
        completed: parsed.data.completed,
      },
    });
  } else {
    await prisma.appointment.create({
      data: {
        userId,
        cadetId: parsed.data.cadetId,
        title: parsed.data.title,
        venue: parsed.data.venue || null,
        appointmentAt,
        notes: parsed.data.notes || null,
        completed: parsed.data.completed,
      },
    });
  }

  revalidateOperationalPages();
  return success(parsed.data.id ? "Appointment updated." : "Appointment created.");
}

export async function deleteAppointmentAction(formData: FormData): Promise<ActionResult> {
  const userId = await requireUser();

  const parsed = appointmentDeleteSchema.safeParse({
    id: parseOptionalString(formData.get("id")),
  });

  if (!parsed.success) {
    return failure("Invalid appointment.");
  }

  await assertAppointmentOwnership(userId, parsed.data.id);

  await prisma.appointment.delete({
    where: {
      id: parsed.data.id,
    },
  });

  revalidateOperationalPages();
  return success("Appointment deleted.");
}
