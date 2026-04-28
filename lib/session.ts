import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CWC_APPOINTMENT_HOLDER = "CWC";

export async function getSessionUser() {
  return auth();
}

export async function requirePageUser() {
  const session = await auth();

  if (!session?.user?.id || !session.user.sessionId) {
    redirect("/cadet/login");
  }

  return session.user;
}

export async function requireSessionUser() {
  const session = await auth();

  if (!session?.user?.id || !session.user.sessionId) {
    redirect("/cadet/login");
  }

  return session.user;
}

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = session?.user?.sessionId;

  if (!userId || !sessionId) {
    redirect("/cadet/login");
  }

  return userId;
}

export async function requireCwcUser() {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = session?.user?.sessionId;
  const cadetId = session?.user?.cadetId;

  if (!userId || !sessionId || !cadetId) {
    redirect("/cadet/login");
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
    redirect("/cadet/login");
  }

  return {
    id: userId,
    userId,
    sessionId,
    cadetId: cadet.id,
    cadetDisplayName: cadet.displayName,
    appointmentHolder: cadet.appointmentHolder,
    name: cadet.displayName,
    batchName: session.user.batchName,
  };
}
