"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { failure, success, type ActionResult } from "@/actions/helpers";
import {
  clearAdminSession,
  createAdminSession,
  getAdminSession,
  isValidAdminPassword,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  adminChangeInstructorPasswordSchema,
  adminLoginSchema,
} from "@/lib/validators/auth";

export type AdminPanelState = {
  isAuthenticated: boolean;
  batchName: string | null;
};

export async function adminLoginAction(input: {
  adminPassword: string;
}): Promise<ActionResult & { batchName?: string | null }> {
  const parsed = adminLoginSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid admin login details.");
  }

  if (!isValidAdminPassword(parsed.data.adminPassword)) {
    return failure("Invalid admin password.");
  }

  await createAdminSession();
  const account = await getInstructorAccount();
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Admin login successful.",
    batchName: account?.batchName ?? null,
  };
}

export async function adminLogoutAction(): Promise<ActionResult> {
  await clearAdminSession();
  revalidatePath("/admin");

  return success("Signed out.");
}

async function getInstructorAccount() {
  return prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      batchName: true,
    },
  });
}

export async function getCurrentAdminPanelState(): Promise<AdminPanelState> {
  const session = await getAdminSession();

  if (!session) {
    return {
      isAuthenticated: false,
      batchName: null,
    };
  }

  const account = await getInstructorAccount();

  return {
    isAuthenticated: true,
    batchName: account?.batchName ?? null,
  };
}

export async function changeInstructorPasswordAsAdminAction(input: {
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = adminChangeInstructorPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid password payload.");
  }

  const session = await getAdminSession();

  if (!session) {
    return failure("Admin session expired. Sign in again.");
  }

  const account = await getInstructorAccount();

  if (!account) {
    return failure("No instructor account has been set up yet.");
  }

  const instructorPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const revokedAt = new Date();
  const [, revokedSessions] = await prisma.$transaction([
    prisma.user.update({
      where: { id: account.id },
      data: { instructorPasswordHash },
    }),
    prisma.adminSession.updateMany({
      where: {
        userId: account.id,
        revokedAt: null,
      },
      data: {
        revokedAt,
        revokedReason: "INSTRUCTOR_PASSWORD_CHANGED",
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/instructors");

  const revokedMessage =
    revokedSessions.count === 1
      ? "1 active instructor session was signed out."
      : `${revokedSessions.count} active instructor sessions were signed out.`;

  return success(`Instructor password updated. ${revokedMessage}`);
}
