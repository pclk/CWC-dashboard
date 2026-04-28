import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

const CADET_RESET_TOKEN_BYTES = 32;
const CADET_RESET_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CADET_PASSWORD_BCRYPT_ROUNDS = 12;
const CADET_RESET_PASSWORD_REVOKE_REASON = "Cadet has set their new password";

export type CadetResetTokenValidation =
  | {
      ok: true;
      cadet: {
        id: string;
        userId: string;
        displayName: string;
        resetTokenExpiresAt: Date;
      };
    }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "REVOKED" | "INACTIVE" };

export function generateCadetResetToken() {
  return randomBytes(CADET_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashCadetResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getCadetResetBaseUrl() {
  const configured =
    process.env.CADET_RESET_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL;

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return null;
}

async function getRequestOrigin() {
  try {
    const requestHeaders = await headers();
    const forwardedHost = requestHeaders.get("x-forwarded-host");
    const host = forwardedHost ?? requestHeaders.get("host");

    if (!host) {
      return null;
    }

    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http");

    return `${protocol}://${host}`;
  } catch {
    return null;
  }
}

export async function createCadetResetLink(cadetId: string) {
  const cadet = await prisma.cadet.findUnique({
    where: { id: cadetId },
    select: { id: true, active: true },
  });

  if (!cadet) {
    throw new Error("Cadet not found.");
  }

  if (!cadet.active) {
    throw new Error("Cadet is inactive.");
  }

  const token = generateCadetResetToken();
  const tokenHash = hashCadetResetToken(token);
  const expiresAt = new Date(Date.now() + CADET_RESET_TOKEN_TTL_MS);

  await prisma.cadet.update({
    where: { id: cadet.id },
    data: {
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: expiresAt,
      resetTokenRevokedAt: null,
      resetTokenRevokedReason: null,
    },
  });

  const origin = getCadetResetBaseUrl() ?? (await getRequestOrigin());
  const path = `/cadet/reset-password?token=${encodeURIComponent(token)}`;
  const url = origin ? `${origin}${path}` : path;

  return {
    cadetId: cadet.id,
    token,
    url,
    expiresAt,
  };
}

export async function validateCadetResetToken(token: string): Promise<CadetResetTokenValidation> {
  if (!token) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const tokenHash = hashCadetResetToken(token);
  const cadet = await prisma.cadet.findFirst({
    where: { resetTokenHash: tokenHash },
    select: {
      id: true,
      userId: true,
      displayName: true,
      active: true,
      resetTokenExpiresAt: true,
      resetTokenRevokedAt: true,
    },
  });

  if (!cadet) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (!cadet.active) {
    return { ok: false, reason: "INACTIVE" };
  }

  if (cadet.resetTokenRevokedAt) {
    return { ok: false, reason: "REVOKED" };
  }

  if (!cadet.resetTokenExpiresAt || cadet.resetTokenExpiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }

  return {
    ok: true,
    cadet: {
      id: cadet.id,
      userId: cadet.userId,
      displayName: cadet.displayName,
      resetTokenExpiresAt: cadet.resetTokenExpiresAt,
    },
  };
}

export async function revokeCadetResetToken(cadetId: string, reason: string) {
  const result = await prisma.cadet.updateMany({
    where: {
      id: cadetId,
      resetTokenHash: { not: null },
      resetTokenRevokedAt: null,
    },
    data: {
      resetTokenRevokedAt: new Date(),
      resetTokenRevokedReason: reason,
    },
  });

  return result.count > 0;
}

export async function setCadetPasswordFromResetToken(token: string, newPassword: string) {
  const validation = await validateCadetResetToken(token);

  if (!validation.ok) {
    return { ok: false as const, reason: validation.reason };
  }

  const passwordHash = await bcrypt.hash(newPassword, CADET_PASSWORD_BCRYPT_ROUNDS);
  const tokenHash = hashCadetResetToken(token);
  const now = new Date();

  const result = await prisma.cadet.updateMany({
    where: {
      id: validation.cadet.id,
      resetTokenHash: tokenHash,
      resetTokenRevokedAt: null,
      resetTokenExpiresAt: { gt: now },
    },
    data: {
      passwordHash,
      lastPasswordSetAt: now,
      resetTokenRevokedAt: now,
      resetTokenRevokedReason: CADET_RESET_PASSWORD_REVOKE_REASON,
    },
  });

  if (result.count === 0) {
    return { ok: false as const, reason: "REVOKED" as const };
  }

  return {
    ok: true as const,
    cadet: {
      id: validation.cadet.id,
      userId: validation.cadet.userId,
      displayName: validation.cadet.displayName,
    },
  };
}
