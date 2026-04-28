"use server";

import type { CadetRequestStatus, CadetRequestType } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { failure, type ActionResult } from "@/actions/helpers";
import { auth } from "@/lib/auth";
import { getCadetSession } from "@/lib/cadet-auth";
import { getInstructorSession } from "@/lib/instructor-auth";
import { prisma } from "@/lib/prisma";
import {
  approveRequestSchema,
  cwcApproveRequestSchema,
  declineRequestSchema,
  mcStatusUpdateRequestSchema,
  reportSickRequestSchema,
  type CwcApproveRequestInput,
  type McStatusUpdateRequestInput,
  type ReportSickRequestInput,
} from "@/lib/validators/cadet-requests";

const CWC_APPOINTMENT_HOLDER = "CWC";

type CadetRequestSummary = {
  id: string;
  status: string;
  type: string;
  cadetId: string;
  resultingCadetRecordId: string | null;
};

async function requireCwcSessionForAction() {
  const session = await auth();
  const userId = session?.user?.id;
  const cadetId = session?.user?.cadetId;
  const appointmentHolder = session?.user?.appointmentHolder;

  if (!userId || !cadetId || appointmentHolder !== CWC_APPOINTMENT_HOLDER) {
    return null;
  }

  const cadet = await prisma.cadet.findFirst({
    where: {
      id: cadetId,
      userId,
      active: true,
      appointmentHolder: CWC_APPOINTMENT_HOLDER,
    },
    select: { displayName: true },
  });

  if (!cadet) {
    return null;
  }

  return { userId, cadetId, cadetDisplayName: cadet.displayName };
}

function getInstructorApprovalLabel(session: {
  displayName: string | null;
  batchName: string;
  userId: string;
}) {
  return session.displayName?.trim() || session.batchName || session.userId;
}

function revalidateRequestSurfaces() {
  revalidatePath("/cwc/dashboard");
  revalidatePath("/cwc/records");
  revalidatePath("/cwc/parade-state");
  revalidatePath("/cwc/instructors");
  revalidatePath("/cadet/dashboard");
  revalidatePath("/cadet/report-sick");
}

export async function createReportSickRequest(
  input: ReportSickRequestInput,
): Promise<ActionResult & { request?: CadetRequestSummary }> {
  const parsed = reportSickRequestSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid report sick input.");
  }

  const cadetSession = await getCadetSession();

  if (!cadetSession) {
    return failure("Cadet session expired. Sign in again.");
  }

  const created = await prisma.cadetRequest.create({
    data: {
      userId: cadetSession.userId,
      cadetId: cadetSession.cadetId,
      type: "REPORT_SICK",
      status: "PENDING_INSTRUCTOR",
      category: parsed.data.category,
      title: parsed.data.title,
      details: parsed.data.details,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      unknownEndTime: parsed.data.unknownEndTime ?? false,
      affectsStrength: parsed.data.affectsStrength ?? true,
      countsNotInCamp: parsed.data.countsNotInCamp ?? false,
    },
    select: { id: true, status: true, type: true, cadetId: true, resultingCadetRecordId: true },
  });

  revalidateRequestSurfaces();

  return { ok: true, message: "Report sick request submitted.", request: created };
}

export async function createMcStatusUpdateRequest(
  input: McStatusUpdateRequestInput,
): Promise<ActionResult & { request?: CadetRequestSummary }> {
  const parsed = mcStatusUpdateRequestSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid MC status update input.");
  }

  const cadetSession = await getCadetSession();

  if (!cadetSession) {
    return failure("Cadet session expired. Sign in again.");
  }

  const created = await prisma.cadetRequest.create({
    data: {
      userId: cadetSession.userId,
      cadetId: cadetSession.cadetId,
      type: "MC_STATUS_UPDATE",
      status: "PENDING_CWC",
      category: parsed.data.category,
      title: parsed.data.title,
      details: parsed.data.details,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      unknownEndTime: parsed.data.unknownEndTime ?? false,
      affectsStrength: parsed.data.affectsStrength ?? true,
      countsNotInCamp: parsed.data.countsNotInCamp ?? false,
    },
    select: { id: true, status: true, type: true, cadetId: true, resultingCadetRecordId: true },
  });

  revalidateRequestSurfaces();

  return { ok: true, message: "MC status update request submitted.", request: created };
}

export async function instructorApproveReportSickRequest(input: {
  requestId: string;
}): Promise<ActionResult & { request?: CadetRequestSummary }> {
  const parsed = approveRequestSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid approval input.");
  }

  const session = await getInstructorSession();

  if (!session) {
    return failure("Instructor session expired. Sign in again.");
  }

  const updated = await prisma.cadetRequest.updateMany({
    where: {
      id: parsed.data.requestId,
      userId: session.userId,
      type: "REPORT_SICK",
      status: "PENDING_INSTRUCTOR",
    },
    data: {
      status: "PENDING_CWC",
      instructorApprovedAt: new Date(),
      instructorApprovedBy: getInstructorApprovalLabel(session),
    },
  });

  if (updated.count === 0) {
    return failure("Request not found or no longer pending instructor approval.");
  }

  const request = await prisma.cadetRequest.findUnique({
    where: { id: parsed.data.requestId },
    select: { id: true, status: true, type: true, cadetId: true, resultingCadetRecordId: true },
  });

  revalidateRequestSurfaces();

  return {
    ok: true,
    message: "Forwarded to CWC for approval.",
    request: request ?? undefined,
  };
}

export async function instructorDeclineRequest(input: {
  requestId: string;
  reason: string;
}): Promise<ActionResult & { request?: CadetRequestSummary }> {
  const parsed = declineRequestSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid decline input.");
  }

  const session = await getInstructorSession();

  if (!session) {
    return failure("Instructor session expired. Sign in again.");
  }

  const updated = await prisma.cadetRequest.updateMany({
    where: {
      id: parsed.data.requestId,
      userId: session.userId,
      status: { in: ["PENDING_INSTRUCTOR", "PENDING_CWC"] },
    },
    data: {
      status: "DECLINED",
      declinedAt: new Date(),
      declinedByRole: "INSTRUCTOR",
      declineReason: parsed.data.reason,
    },
  });

  if (updated.count === 0) {
    return failure("Request not found or no longer actionable.");
  }

  const request = await prisma.cadetRequest.findUnique({
    where: { id: parsed.data.requestId },
    select: { id: true, status: true, type: true, cadetId: true, resultingCadetRecordId: true },
  });

  revalidateRequestSurfaces();

  return { ok: true, message: "Request declined.", request: request ?? undefined };
}

export async function cwcDeclineRequest(input: {
  requestId: string;
  reason: string;
}): Promise<ActionResult & { request?: CadetRequestSummary }> {
  const parsed = declineRequestSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid decline input.");
  }

  const cwc = await requireCwcSessionForAction();

  if (!cwc) {
    return failure("CWC session required.");
  }

  const updated = await prisma.cadetRequest.updateMany({
    where: {
      id: parsed.data.requestId,
      userId: cwc.userId,
      status: { in: ["PENDING_INSTRUCTOR", "PENDING_CWC"] },
    },
    data: {
      status: "DECLINED",
      declinedAt: new Date(),
      declinedByRole: "CWC",
      declineReason: parsed.data.reason,
    },
  });

  if (updated.count === 0) {
    return failure("Request not found or no longer actionable.");
  }

  const request = await prisma.cadetRequest.findUnique({
    where: { id: parsed.data.requestId },
    select: { id: true, status: true, type: true, cadetId: true, resultingCadetRecordId: true },
  });

  revalidateRequestSurfaces();

  return { ok: true, message: "Request declined.", request: request ?? undefined };
}

export async function cwcApproveRequestAndCreateRecord(
  input: CwcApproveRequestInput,
): Promise<ActionResult & { request?: CadetRequestSummary; recordId?: string }> {
  const parsed = cwcApproveRequestSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid approval input.");
  }

  const cwc = await requireCwcSessionForAction();

  if (!cwc) {
    return failure("CWC session required.");
  }

  const request = await prisma.cadetRequest.findFirst({
    where: {
      id: parsed.data.requestId,
      userId: cwc.userId,
      status: "PENDING_CWC",
    },
  });

  if (!request) {
    return failure("Request not found or not awaiting CWC approval.");
  }

  if (request.type !== "REPORT_SICK" && request.type !== "MC_STATUS_UPDATE") {
    return failure("Unsupported request type.");
  }

  const edits = parsed.data.editedRecord;

  const recordData = {
    category: edits?.category ?? request.category,
    title: edits?.title ?? request.title,
    details: edits?.details ?? request.details,
    startAt: edits?.startAt ?? request.startAt,
    endAt: edits?.endAt ?? request.endAt,
    unknownEndTime: edits?.unknownEndTime ?? request.unknownEndTime,
    affectsStrength: edits?.affectsStrength ?? request.affectsStrength,
    countsNotInCamp: edits?.countsNotInCamp ?? request.countsNotInCamp,
  };

  const now = new Date();
  const explicitTargetId = parsed.data.targetRecordId;

  if (explicitTargetId) {
    const target = await prisma.cadetRecord.findFirst({
      where: {
        id: explicitTargetId,
        userId: cwc.userId,
        cadetId: request.cadetId,
      },
      select: { id: true },
    });

    if (!target) {
      return failure("Selected record not found for this cadet.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let recordId = explicitTargetId ?? request.resultingCadetRecordId ?? null;

    if (recordId) {
      await tx.cadetRecord.update({
        where: { id: recordId },
        data: recordData,
      });
    } else {
      const created = await tx.cadetRecord.create({
        data: {
          userId: cwc.userId,
          cadetId: request.cadetId,
          ...recordData,
        },
        select: { id: true },
      });
      recordId = created.id;
    }

    await tx.cadetRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        cwcApprovedAt: now,
        cwcApprovedBy: cwc.cadetDisplayName,
        resultingCadetRecordId: recordId,
      },
    });

    return { recordId };
  });

  const refreshed = await prisma.cadetRequest.findUnique({
    where: { id: request.id },
    select: { id: true, status: true, type: true, cadetId: true, resultingCadetRecordId: true },
  });

  revalidateRequestSurfaces();

  return {
    ok: true,
    message: "Request approved.",
    request: refreshed ?? undefined,
    recordId: result.recordId,
  };
}

export type CadetRequestHistoryEntry = {
  id: string;
  type: CadetRequestType;
  category: string;
  title: string | null;
  details: string | null;
  status: CadetRequestStatus;
  startAt: string | null;
  endAt: string | null;
  unknownEndTime: boolean;
  createdAt: string;
  instructorApprovedAt: string | null;
  instructorApprovedBy: string | null;
  cwcApprovedAt: string | null;
  cwcApprovedBy: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  declinedByRole: string | null;
};

export async function getMyCadetRequests(options?: {
  type?: CadetRequestType;
}): Promise<CadetRequestHistoryEntry[]> {
  const cadetSession = await getCadetSession();

  if (!cadetSession) {
    return [];
  }

  const requests = await prisma.cadetRequest.findMany({
    where: {
      cadetId: cadetSession.cadetId,
      userId: cadetSession.userId,
      ...(options?.type ? { type: options.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      category: true,
      title: true,
      details: true,
      status: true,
      startAt: true,
      endAt: true,
      unknownEndTime: true,
      createdAt: true,
      instructorApprovedAt: true,
      instructorApprovedBy: true,
      cwcApprovedAt: true,
      cwcApprovedBy: true,
      declinedAt: true,
      declineReason: true,
      declinedByRole: true,
    },
  });

  return requests.map((request) => ({
    id: request.id,
    type: request.type,
    category: request.category,
    title: request.title,
    details: request.details,
    status: request.status,
    startAt: request.startAt ? request.startAt.toISOString() : null,
    endAt: request.endAt ? request.endAt.toISOString() : null,
    unknownEndTime: request.unknownEndTime,
    createdAt: request.createdAt.toISOString(),
    instructorApprovedAt: request.instructorApprovedAt
      ? request.instructorApprovedAt.toISOString()
      : null,
    instructorApprovedBy: request.instructorApprovedBy,
    cwcApprovedAt: request.cwcApprovedAt ? request.cwcApprovedAt.toISOString() : null,
    cwcApprovedBy: request.cwcApprovedBy,
    declinedAt: request.declinedAt ? request.declinedAt.toISOString() : null,
    declineReason: request.declineReason,
    declinedByRole: request.declinedByRole,
  }));
}

export type ActiveCadetRecordOption = {
  id: string;
  category: string;
  title: string | null;
  details: string | null;
  startAt: string | null;
  endAt: string | null;
  unknownEndTime: boolean;
};

export async function getActiveCadetRecordsForCadet(input: {
  cadetId: string;
  category?: string;
}): Promise<ActiveCadetRecordOption[]> {
  const cwc = await requireCwcSessionForAction();

  if (!cwc) {
    return [];
  }

  if (!input?.cadetId || typeof input.cadetId !== "string") {
    return [];
  }

  const records = await prisma.cadetRecord.findMany({
    where: {
      userId: cwc.userId,
      cadetId: input.cadetId,
      resolutionState: "ACTIVE",
      ...(input.category ? { category: input.category as never } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      category: true,
      title: true,
      details: true,
      startAt: true,
      endAt: true,
      unknownEndTime: true,
    },
  });

  return records.map((record) => ({
    id: record.id,
    category: record.category,
    title: record.title,
    details: record.details,
    startAt: record.startAt ? record.startAt.toISOString() : null,
    endAt: record.endAt ? record.endAt.toISOString() : null,
    unknownEndTime: record.unknownEndTime,
  }));
}

export type CwcPendingRequest = {
  requestId: string;
  type: CadetRequestType;
  cadetId: string;
  cadetDisplayName: string;
  category: string;
  title: string | null;
  details: string | null;
  startAt: string | null;
  endAt: string | null;
  unknownEndTime: boolean;
  affectsStrength: boolean;
  countsNotInCamp: boolean;
  instructorApprovedAt: string | null;
  instructorApprovedBy: string | null;
  createdAt: string;
};

export async function getCwcPendingRequests(): Promise<CwcPendingRequest[]> {
  const cwc = await requireCwcSessionForAction();

  if (!cwc) {
    return [];
  }

  const requests = await prisma.cadetRequest.findMany({
    where: {
      userId: cwc.userId,
      status: "PENDING_CWC",
      type: { in: ["REPORT_SICK", "MC_STATUS_UPDATE"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      cadetId: true,
      category: true,
      title: true,
      details: true,
      startAt: true,
      endAt: true,
      unknownEndTime: true,
      affectsStrength: true,
      countsNotInCamp: true,
      instructorApprovedAt: true,
      instructorApprovedBy: true,
      createdAt: true,
      cadet: { select: { displayName: true } },
    },
  });

  return requests.map((request) => ({
    requestId: request.id,
    type: request.type,
    cadetId: request.cadetId,
    cadetDisplayName: request.cadet.displayName,
    category: request.category,
    title: request.title,
    details: request.details,
    startAt: request.startAt ? request.startAt.toISOString() : null,
    endAt: request.endAt ? request.endAt.toISOString() : null,
    unknownEndTime: request.unknownEndTime,
    affectsStrength: request.affectsStrength,
    countsNotInCamp: request.countsNotInCamp,
    instructorApprovedAt: request.instructorApprovedAt
      ? request.instructorApprovedAt.toISOString()
      : null,
    instructorApprovedBy: request.instructorApprovedBy,
    createdAt: request.createdAt.toISOString(),
  }));
}
