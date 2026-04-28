import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const CADET_SESSION_COOKIE_NAME = "cwc_cadet_session";
const CADET_SESSION_COOKIE_PATH = "/cadet";
const CADET_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const CADET_SESSION_VERSION = 1;
const CADET_PASSWORD_FINGERPRINT_PREFIX = "cwc-dashboard-cadet-password-v1";

const cadetSessionTokenSchema = z.object({
  v: z.literal(CADET_SESSION_VERSION),
  sub: z.string().min(1),
  userId: z.string().min(1),
  displayName: z.string().min(1),
  appointmentHolder: z.string().nullable(),
  cadetPasswordFingerprint: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

type CadetSessionTokenPayload = z.infer<typeof cadetSessionTokenSchema>;

export type CadetSession = {
  cadetId: string;
  userId: string;
  displayName: string;
  appointmentHolder: string | null;
  expiresAt: Date;
};

function getCadetAuthSecret() {
  const secret =
    process.env.CADET_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("CADET_AUTH_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET is required for cadet sessions.");
  }

  return secret;
}

function getCadetPasswordFingerprint(passwordHash: string) {
  return createHmac("sha256", getCadetAuthSecret())
    .update(`${CADET_PASSWORD_FINGERPRINT_PREFIX}:${passwordHash}`)
    .digest("hex");
}

function signTokenBody(body: string) {
  return createHmac("sha256", getCadetAuthSecret()).update(body).digest("base64url");
}

function encodeCadetSessionToken(payload: CadetSessionTokenPayload) {
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

function decodeCadetSessionToken(token: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature || !signaturesMatch(signature, signTokenBody(body))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const payload = cadetSessionTokenSchema.safeParse(parsed);

    if (!payload.success) {
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

export async function createCadetSession(cadet: {
  id: string;
  userId: string;
  displayName: string;
  appointmentHolder: string | null;
  passwordHash: string;
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowSeconds + CADET_SESSION_MAX_AGE_SECONDS;
  const payload: CadetSessionTokenPayload = {
    v: CADET_SESSION_VERSION,
    sub: cadet.id,
    userId: cadet.userId,
    displayName: cadet.displayName,
    appointmentHolder: cadet.appointmentHolder,
    cadetPasswordFingerprint: getCadetPasswordFingerprint(cadet.passwordHash),
    iat: nowSeconds,
    exp: expiresAtSeconds,
  };

  const cookieStore = await cookies();
  cookieStore.set(CADET_SESSION_COOKIE_NAME, encodeCadetSessionToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: CADET_SESSION_COOKIE_PATH,
    maxAge: CADET_SESSION_MAX_AGE_SECONDS,
  });

  return {
    cadetId: cadet.id,
    userId: cadet.userId,
    displayName: cadet.displayName,
    appointmentHolder: cadet.appointmentHolder,
    expiresAt: new Date(expiresAtSeconds * 1000),
  } satisfies CadetSession;
}

export async function clearCadetSession() {
  const cookieStore = await cookies();

  cookieStore.delete({
    name: CADET_SESSION_COOKIE_NAME,
    path: CADET_SESSION_COOKIE_PATH,
  });
}

export async function getCadetSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CADET_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeCadetSessionToken(token);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!payload || payload.exp <= nowSeconds) {
    return null;
  }

  const cadet = await prisma.cadet.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      userId: true,
      displayName: true,
      active: true,
      appointmentHolder: true,
      passwordHash: true,
    },
  });

  if (!cadet || cadet.userId !== payload.userId || !cadet.active || !cadet.passwordHash) {
    return null;
  }

  const expectedFingerprint = getCadetPasswordFingerprint(cadet.passwordHash);

  if (payload.cadetPasswordFingerprint !== expectedFingerprint) {
    return null;
  }

  return {
    cadetId: cadet.id,
    userId: cadet.userId,
    displayName: cadet.displayName,
    appointmentHolder: cadet.appointmentHolder,
    expiresAt: new Date(payload.exp * 1000),
  } satisfies CadetSession;
}

export async function requireCadetSession() {
  const session = await getCadetSession();

  if (!session) {
    redirect("/cadet/login");
  }

  return session;
}
