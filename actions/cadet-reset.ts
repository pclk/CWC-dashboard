"use server";

import { redirect } from "next/navigation";

import { failure, type ActionResult } from "@/actions/helpers";
import { setCadetPasswordFromResetToken } from "@/lib/cadet-reset";
import { cadetResetPasswordSchema } from "@/lib/validators/auth";

function reasonToMessage(reason: "NOT_FOUND" | "EXPIRED" | "REVOKED" | "INACTIVE") {
  switch (reason) {
    case "EXPIRED":
      return "This reset link has expired. Ask your instructor for a new one.";
    case "REVOKED":
      return "This reset link is no longer active. Ask your instructor for a new one.";
    case "INACTIVE":
      return "This account is inactive.";
    case "NOT_FOUND":
    default:
      return "This reset link is invalid.";
  }
}

export async function cadetResetPasswordAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult | undefined> {
  const parsed = cadetResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message ?? "Invalid reset password input.");
  }

  const result = await setCadetPasswordFromResetToken(parsed.data.token, parsed.data.password);

  if (!result.ok) {
    return failure(reasonToMessage(result.reason));
  }

  redirect("/cadet/login");
}
