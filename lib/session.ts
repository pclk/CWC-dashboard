import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function getSessionUser() {
  return auth();
}

export async function requirePageUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
