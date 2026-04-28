"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { failure, type ActionResult } from "@/actions/helpers";
import { clearCadetSession, createCadetSession } from "@/lib/cadet-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cadetLoginSchema } from "@/lib/validators/auth";

const CWC_APPOINTMENT_HOLDER = "CWC";

export async function cadetLoginAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult | undefined> {
  const parsed = cadetLoginSchema.safeParse({
    cadetIdentifier: formData.get("cadetIdentifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return failure("Invalid credentials.");
  }

  const cadet = await prisma.cadet.findFirst({
    where: {
      active: true,
      passwordHash: { not: null },
      OR: [
        { displayName: { equals: parsed.data.cadetIdentifier, mode: "insensitive" } },
        { shorthand: { equals: parsed.data.cadetIdentifier, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      userId: true,
      displayName: true,
      passwordHash: true,
      appointmentHolder: true,
    },
  });

  if (!cadet?.passwordHash) {
    return failure("Invalid credentials.");
  }

  const validPassword = await bcrypt.compare(parsed.data.password, cadet.passwordHash);

  if (!validPassword) {
    return failure("Invalid credentials.");
  }

  if (cadet.appointmentHolder === CWC_APPOINTMENT_HOLDER) {
    try {
      await signIn("credentials", {
        cadetIdentifier: parsed.data.cadetIdentifier,
        password: parsed.data.password,
        redirectTo: "/cwc/dashboard",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return failure("Invalid credentials.");
      }

      throw error;
    }
  }

  await createCadetSession({
    id: cadet.id,
    userId: cadet.userId,
    displayName: cadet.displayName,
    appointmentHolder: cadet.appointmentHolder,
    passwordHash: cadet.passwordHash,
  });

  redirect("/cadet/dashboard");
}

export async function cadetLogoutAction() {
  await clearCadetSession();
  redirect("/cadet/login");
}
