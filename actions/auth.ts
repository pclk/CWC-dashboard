"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { failure, success, type ActionResult } from "@/actions/helpers";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS_VALUES, DEFAULT_TEMPLATE_DEFINITIONS } from "@/lib/templates";
import { loginSchema, setupSchema } from "@/lib/validators/auth";

export async function loginAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult | undefined> {
  const parsed = loginSchema.safeParse({
    cadetIdentifier: formData.get("cadetIdentifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid login details.");
  }

  try {
    await signIn("credentials", {
      cadetIdentifier: parsed.data.cadetIdentifier,
      password: parsed.data.password,
      redirectTo: "/cwc/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return failure("Invalid credentials or not assigned as CWC.");
    }

    throw error;
  }
}

export async function createInitialUserAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult | undefined> {
  const parsed = setupSchema.safeParse({
    displayName: formData.get("displayName"),
    batchName: formData.get("batchName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid setup payload.");
  }

  const existingUserCount = await prisma.user.count();

  if (existingUserCount > 0) {
    redirect("/cadet/login");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        batchName: parsed.data.batchName,
        passwordHash,
        instructorPasswordHash: passwordHash,
        displayName: parsed.data.displayName || null,
      },
    });

    await tx.userSettings.create({
      data: {
        userId: user.id,
        unitName: DEFAULT_SETTINGS_VALUES.unitName,
        defaultParadePrefix: DEFAULT_SETTINGS_VALUES.defaultParadePrefix,
        defaultNightPrefix: DEFAULT_SETTINGS_VALUES.defaultNightPrefix,
        defaultLastParadeText: DEFAULT_SETTINGS_VALUES.defaultLastParadeText,
        defaultMtrMorningText: DEFAULT_SETTINGS_VALUES.defaultMtrMorningText,
        defaultMtrAfternoonText: DEFAULT_SETTINGS_VALUES.defaultMtrAfternoonText,
      },
    });

    await tx.messageTemplate.createMany({
      data: DEFAULT_TEMPLATE_DEFINITIONS.map((template) => ({
        userId: user.id,
        type: template.type,
        name: template.name,
        body: template.body,
        isDefault: template.isDefault,
      })),
    });
  });

  try {
    await signIn("credentials", {
      batchName: parsed.data.batchName,
      password: parsed.data.password,
      redirectTo: "/cwc/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return success("Account created. Please sign in.");
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({
    redirectTo: "/cadet/login",
  });
}
