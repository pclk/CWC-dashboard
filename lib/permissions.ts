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
