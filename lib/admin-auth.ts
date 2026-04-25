import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSessionDeviceMetadataFromHeaders } from "@/lib/session-metadata";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "The0GCWCizM@tthew";
const ADMIN_SESSION_COOKIE_NAME = "cwc_admin_session";
const ADMIN_SESSION_COOKIE_PATH = "/admin";
const ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const ADMIN_SESSION_LAST_SEEN_WRITE_INTERVAL_MS = 60_000;
const ADMIN_SESSION_VERSION = 1;
const ADMIN_PASSWORD_FINGERPRINT_PREFIX = "cwc-dashboard-admin-password-v1";

const adminSessionTokenSchema = z.object({
  v: z.literal(ADMIN_SESSION_VERSION),
  sid: z.string().min(1),
  sub: z.string().min(1),
  email: z.email(),
  displayName: z.string().nullable(),
  adminPasswordFingerprint: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

type AdminSessionTokenPayload = z.infer<typeof adminSessionTokenSchema>;

export type AdminSession = {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string | null;
  expiresAt: Date;
};

function getAdminAuthSecret() {
  const secret =
    process.env.ADMIN_AUTH_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("ADMIN_AUTH_SECRET or AUTH_SECRET is required for admin dashboard sessions.");
  }

  return secret;
}

function digest(value: string, prefix: string) {
  return createHash("sha256").update(`${prefix}:${value}`).digest();
}

function getAdminPasswordComparisonDigest(adminPassword: string) {
  return digest(adminPassword, ADMIN_PASSWORD_FINGERPRINT_PREFIX);
}

export function isValidAdminPassword(adminPassword: string) {
  const actualDigest = getAdminPasswordComparisonDigest(adminPassword);
  const expectedDigest = getAdminPasswordComparisonDigest(ADMIN_PASSWORD);

  return timingSafeEqual(actualDigest, expectedDigest);
}

function getAdminPasswordFingerprint() {
  return createHmac("sha256", getAdminAuthSecret())
    .update(`${ADMIN_PASSWORD_FINGERPRINT_PREFIX}:${ADMIN_PASSWORD}`)
    .digest("hex");
}

function signTokenBody(body: string) {
  return createHmac("sha256", getAdminAuthSecret()).update(body).digest("base64url");
}

function encodeAdminSessionToken(payload: AdminSessionTokenPayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signTokenBody(body)}`;
}

function signaturesMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function decodeAdminSessionToken(token: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature || !signaturesMatch(signature, signTokenBody(body))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const payload = adminSessionTokenSchema.safeParse(parsed);

    if (!payload.success) {
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

async function revokeAdminSession(sessionId: string, reason: string) {
  await prisma.adminSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
}

export async function createAdminSession(user: {
  id: string;
  email: string;
  displayName: string | null;
}) {
  const requestHeaders = await headers();
  const deviceMetadata = getSessionDeviceMetadataFromHeaders(requestHeaders);
  const signedInAt = new Date();
  const adminSession = await prisma.adminSession.create({
    data: {
      userId: user.id,
      userAgent: deviceMetadata.userAgent,
      ipAddress: deviceMetadata.ipAddress,
      browser: deviceMetadata.browser,
      os: deviceMetadata.os,
      deviceType: deviceMetadata.deviceType,
      deviceLabel: deviceMetadata.deviceLabel,
      signedInAt,
      lastSeenAt: signedInAt,
    },
  });
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowSeconds + ADMIN_SESSION_MAX_AGE_SECONDS;
  const payload: AdminSessionTokenPayload = {
    v: ADMIN_SESSION_VERSION,
    sid: adminSession.id,
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    adminPasswordFingerprint: getAdminPasswordFingerprint(),
    iat: nowSeconds,
    exp: expiresAtSeconds,
  };

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, encodeAdminSessionToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_SESSION_COOKIE_PATH,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return {
    sessionId: adminSession.id,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    expiresAt: new Date(expiresAtSeconds * 1000),
  } satisfies AdminSession;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const payload = token ? decodeAdminSessionToken(token) : null;

  if (payload) {
    await revokeAdminSession(payload.sid, "SIGNED_OUT");
  }

  cookieStore.delete({
    name: ADMIN_SESSION_COOKIE_NAME,
    path: ADMIN_SESSION_COOKIE_PATH,
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeAdminSessionToken(token);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!payload || payload.exp <= nowSeconds) {
    return null;
  }

  if (payload.adminPasswordFingerprint !== getAdminPasswordFingerprint()) {
    await revokeAdminSession(payload.sid, "ADMIN_PASSWORD_CHANGED");
    return null;
  }

  const adminSession = await prisma.adminSession.findUnique({
    where: { id: payload.sid },
    select: {
      id: true,
      userId: true,
      lastSeenAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  if (
    !adminSession ||
    adminSession.revokedAt ||
    adminSession.userId !== payload.sub ||
    adminSession.user.email !== payload.email
  ) {
    return null;
  }

  const now = new Date();

  if (
    now.getTime() - adminSession.lastSeenAt.getTime() >
    ADMIN_SESSION_LAST_SEEN_WRITE_INTERVAL_MS
  ) {
    await prisma.adminSession.updateMany({
      where: {
        id: adminSession.id,
        revokedAt: null,
      },
      data: {
        lastSeenAt: now,
      },
    });
  }

  return {
    sessionId: adminSession.id,
    userId: adminSession.user.id,
    email: adminSession.user.email,
    displayName: adminSession.user.displayName,
    expiresAt: new Date(payload.exp * 1000),
  } satisfies AdminSession;
}
