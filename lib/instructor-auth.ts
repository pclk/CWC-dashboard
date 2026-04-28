import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSessionDeviceMetadataFromHeaders } from "@/lib/session-metadata";

const INSTRUCTOR_SESSION_COOKIE_NAME = "cwc_instructor_session";
const INSTRUCTOR_SESSION_COOKIE_PATH = "/cwc/instructors";
const INSTRUCTOR_SESSION_LAST_SEEN_WRITE_INTERVAL_MS = 60_000;
const INSTRUCTOR_SESSION_VERSION = 1;
const INSTRUCTOR_PASSWORD_FINGERPRINT_PREFIX = "cwc-dashboard-instructor-password-v1";

const ONE_DAY_SECONDS = 24 * 60 * 60;

export type InstructorRememberDuration = "1d" | "7d" | "30d";

const INSTRUCTOR_REMEMBER_DURATION_SECONDS: Record<InstructorRememberDuration, number> = {
  "1d": ONE_DAY_SECONDS,
  "7d": 7 * ONE_DAY_SECONDS,
  "30d": 30 * ONE_DAY_SECONDS,
};

const DEFAULT_INSTRUCTOR_REMEMBER_DURATION: InstructorRememberDuration = "1d";

const instructorSessionTokenSchema = z.object({
  v: z.literal(INSTRUCTOR_SESSION_VERSION),
  sid: z.string().min(1),
  sub: z.string().min(1),
  batchName: z.string().min(1),
  displayName: z.string().nullable(),
  instructorPasswordFingerprint: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

type InstructorSessionTokenPayload = z.infer<typeof instructorSessionTokenSchema>;

export type InstructorSession = {
  sessionId: string;
  userId: string;
  batchName: string;
  displayName: string | null;
  expiresAt: Date;
};

function getInstructorAuthSecret() {
  const secret =
    process.env.INSTRUCTOR_AUTH_SECRET ??
    process.env.ADMIN_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "INSTRUCTOR_AUTH_SECRET, ADMIN_AUTH_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET is required for instructor sessions.",
    );
  }

  return secret;
}

function getInstructorPasswordFingerprint(passwordHash: string) {
  return createHmac("sha256", getInstructorAuthSecret())
    .update(`${INSTRUCTOR_PASSWORD_FINGERPRINT_PREFIX}:${passwordHash}`)
    .digest("hex");
}

function signTokenBody(body: string) {
  return createHmac("sha256", getInstructorAuthSecret()).update(body).digest("base64url");
}

function encodeInstructorSessionToken(payload: InstructorSessionTokenPayload) {
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

function decodeInstructorSessionToken(token: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature || !signaturesMatch(signature, signTokenBody(body))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const payload = instructorSessionTokenSchema.safeParse(parsed);

    if (!payload.success) {
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

async function revokeInstructorSession(sessionId: string, reason: string) {
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

export async function createInstructorSession(
  user: {
    id: string;
    batchName: string;
    displayName: string | null;
    instructorPasswordHash: string;
  },
  options?: { rememberDuration?: InstructorRememberDuration },
) {
  const rememberDuration = options?.rememberDuration ?? DEFAULT_INSTRUCTOR_REMEMBER_DURATION;
  const maxAgeSeconds = INSTRUCTOR_REMEMBER_DURATION_SECONDS[rememberDuration];
  const requestHeaders = await headers();
  const deviceMetadata = getSessionDeviceMetadataFromHeaders(requestHeaders);
  const signedInAt = new Date();
  const instructorSession = await prisma.adminSession.create({
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
  const expiresAtSeconds = nowSeconds + maxAgeSeconds;
  const payload: InstructorSessionTokenPayload = {
    v: INSTRUCTOR_SESSION_VERSION,
    sid: instructorSession.id,
    sub: user.id,
    batchName: user.batchName,
    displayName: user.displayName,
    instructorPasswordFingerprint: getInstructorPasswordFingerprint(user.instructorPasswordHash),
    iat: nowSeconds,
    exp: expiresAtSeconds,
  };

  const cookieStore = await cookies();
  cookieStore.set(INSTRUCTOR_SESSION_COOKIE_NAME, encodeInstructorSessionToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: INSTRUCTOR_SESSION_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  });

  return {
    sessionId: instructorSession.id,
    userId: user.id,
    batchName: user.batchName,
    displayName: user.displayName,
    expiresAt: new Date(expiresAtSeconds * 1000),
  } satisfies InstructorSession;
}

export async function clearInstructorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(INSTRUCTOR_SESSION_COOKIE_NAME)?.value;
  const payload = token ? decodeInstructorSessionToken(token) : null;

  if (payload) {
    await revokeInstructorSession(payload.sid, "SIGNED_OUT");
  }

  cookieStore.delete({
    name: INSTRUCTOR_SESSION_COOKIE_NAME,
    path: INSTRUCTOR_SESSION_COOKIE_PATH,
  });
}

export async function getInstructorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(INSTRUCTOR_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeInstructorSessionToken(token);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!payload || payload.exp <= nowSeconds) {
    return null;
  }

  const instructorSession = await prisma.adminSession.findUnique({
    where: { id: payload.sid },
    select: {
      id: true,
      userId: true,
      lastSeenAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          batchName: true,
          displayName: true,
          instructorPasswordHash: true,
        },
      },
    },
  });

  if (
    !instructorSession ||
    instructorSession.revokedAt ||
    instructorSession.userId !== payload.sub
  ) {
    return null;
  }

  const expectedFingerprint = getInstructorPasswordFingerprint(
    instructorSession.user.instructorPasswordHash,
  );

  if (payload.instructorPasswordFingerprint !== expectedFingerprint) {
    await revokeInstructorSession(payload.sid, "INSTRUCTOR_PASSWORD_CHANGED");
    return null;
  }

  const now = new Date();

  if (
    now.getTime() - instructorSession.lastSeenAt.getTime() >
    INSTRUCTOR_SESSION_LAST_SEEN_WRITE_INTERVAL_MS
  ) {
    await prisma.adminSession.updateMany({
      where: {
        id: instructorSession.id,
        revokedAt: null,
      },
      data: {
        lastSeenAt: now,
      },
    });
  }

  return {
    sessionId: instructorSession.id,
    userId: instructorSession.user.id,
    batchName: instructorSession.user.batchName,
    displayName: instructorSession.user.displayName,
    expiresAt: new Date(payload.exp * 1000),
  } satisfies InstructorSession;
}
