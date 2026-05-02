import { CetActorRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getCadetSession } from "@/lib/cadet-auth";
import { getInstructorSession } from "@/lib/instructor-auth";
import { prisma } from "@/lib/prisma";

const CWC_APPOINTMENT_HOLDER = "CWC";

export class CetUnauthorizedError extends Error {
  constructor(message = "Sign in as CWC or instructor to manage CET.") {
    super(message);
    this.name = "CetUnauthorizedError";
  }
}

export class CetCadetUnauthorizedError extends Error {
  constructor(message = "Sign in as a cadet to view CET.") {
    super(message);
    this.name = "CetCadetUnauthorizedError";
  }
}

export type CetEditor = {
  userId: string;
  actorRole: Extract<CetActorRole, "CWC" | "INSTRUCTOR">;
  actorName: string;
};

export type CetCadetViewer = {
  userId: string;
  cadetId: string;
  displayName: string;
};

async function resolveCwcEditor(): Promise<CetEditor | null> {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = session?.user?.sessionId;
  const cadetId = session?.user?.cadetId;

  if (!userId || !sessionId || !cadetId) {
    return null;
  }

  const cadet = await prisma.cadet.findUnique({
    where: { id: cadetId },
    select: {
      id: true,
      userId: true,
      displayName: true,
      active: true,
      appointmentHolder: true,
    },
  });

  if (
    !cadet ||
    cadet.userId !== userId ||
    !cadet.active ||
    cadet.appointmentHolder !== CWC_APPOINTMENT_HOLDER
  ) {
    return null;
  }

  return {
    userId,
    actorRole: "CWC",
    actorName: cadet.displayName,
  };
}

async function resolveInstructorEditor(): Promise<CetEditor | null> {
  const session = await getInstructorSession();

  if (!session) {
    return null;
  }

  const actorName =
    session.displayName?.trim() || session.batchName || session.userId;

  return {
    userId: session.userId,
    actorRole: "INSTRUCTOR",
    actorName,
  };
}

export async function getCetEditor(): Promise<CetEditor | null> {
  const cwcEditor = await resolveCwcEditor();

  if (cwcEditor) {
    return cwcEditor;
  }

  return resolveInstructorEditor();
}

export async function requireCetEditor(): Promise<CetEditor> {
  const editor = await getCetEditor();

  if (!editor) {
    throw new CetUnauthorizedError();
  }

  return editor;
}

export async function requireCetViewerForCadet(): Promise<CetCadetViewer> {
  const session = await getCadetSession();

  if (!session) {
    throw new CetCadetUnauthorizedError();
  }

  return {
    userId: session.userId,
    cadetId: session.cadetId,
    displayName: session.displayName,
  };
}
