import { prisma } from "@/lib/prisma";

export async function assertCadetOwnership(userId: string, cadetId: string) {
  const cadet = await prisma.cadet.findFirst({
    where: { id: cadetId, userId },
    select: { id: true },
  });

  if (!cadet) {
    throw new Error("Cadet not found");
  }

  return cadet;
}

export async function assertRecordOwnership(userId: string, recordId: string) {
  const record = await prisma.cadetRecord.findFirst({
    where: { id: recordId, userId },
    select: { id: true },
  });

  if (!record) {
    throw new Error("Record not found");
  }

  return record;
}

export async function assertAppointmentOwnership(userId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, userId },
    select: { id: true },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  return appointment;
}

export async function assertSnapshotOwnership(userId: string, snapshotId: string) {
  const snapshot = await prisma.paradeStateSnapshot.findFirst({
    where: { id: snapshotId, userId },
    select: { id: true },
  });

  if (!snapshot) {
    throw new Error("Snapshot not found");
  }

  return snapshot;
}

export async function assertTroopMovementOwnership(userId: string, movementId: string) {
  const movement = await prisma.troopMovement.findFirst({
    where: { id: movementId, userId },
    select: { id: true },
  });

  if (!movement) {
    throw new Error("Troop movement not found");
  }

  return movement;
}

export async function assertWeeklyTodoOwnership(userId: string, todoId: string) {
  const todo = await prisma.weeklyTodo.findFirst({
    where: { id: todoId, userId },
    select: { id: true },
  });

  if (!todo) {
    throw new Error("Weekly todo not found");
  }

  return todo;
}

export async function assertCurrentAffairSharingOwnership(userId: string, entryId: string) {
  const entry = await prisma.currentAffairSharing.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });

  if (!entry) {
    throw new Error("Current affair sharing entry not found");
  }

  return entry;
}

export async function assertDutyInstructorOwnership(userId: string, dutyInstructorId: string) {
  const dutyInstructor = await prisma.dutyInstructor.findFirst({
    where: { id: dutyInstructorId, userId },
    select: { id: true },
  });

  if (!dutyInstructor) {
    throw new Error("Duty instructor entry not found");
  }

  return dutyInstructor;
}
