import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function getSessionUser() {
  return auth();
}

export async function requirePageUser() {
  const session = await auth();

  if (!session?.user?.id || !session.user.sessionId) {
    redirect("/login");
  }

  return session.user;
}

export async function requireSessionUser() {
  const session = await auth();

  if (!session?.user?.id || !session.user.sessionId) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = session?.user?.sessionId;

  if (!userId || !sessionId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
