import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SESSION_COOKIE_NAME = "cwc_root_admin_session";
const ADMIN_SESSION_COOKIE_PATH = "/admin";
const ADMIN_SESSION_MAX_AGE_SECONDS = 30 * 60;
const ADMIN_SESSION_VERSION = 1;
const ADMIN_PASSWORD_FINGERPRINT_PREFIX = "cwc-dashboard-root-admin-password-v1";

const adminSessionTokenSchema = z.object({
  v: z.literal(ADMIN_SESSION_VERSION),
  adminPasswordFingerprint: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

type AdminSessionTokenPayload = z.infer<typeof adminSessionTokenSchema>;

export type AdminSession = {
  expiresAt: Date;
};

function getAdminAuthSecret() {
  const secret =
    process.env.ADMIN_AUTH_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("ADMIN_AUTH_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET is required for admin sessions.");
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
  if (!ADMIN_PASSWORD) {
    return false;
  }

  const actualDigest = getAdminPasswordComparisonDigest(adminPassword);
  const expectedDigest = getAdminPasswordComparisonDigest(ADMIN_PASSWORD);

  return timingSafeEqual(actualDigest, expectedDigest);
}

function getAdminPasswordFingerprint() {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is required for admin sessions.");
  }

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

export async function createAdminSession() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowSeconds + ADMIN_SESSION_MAX_AGE_SECONDS;
  const payload: AdminSessionTokenPayload = {
    v: ADMIN_SESSION_VERSION,
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
    expiresAt: new Date(expiresAtSeconds * 1000),
  } satisfies AdminSession;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

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

  if (!payload || payload.exp <= nowSeconds || !ADMIN_PASSWORD) {
    return null;
  }

  if (payload.adminPasswordFingerprint !== getAdminPasswordFingerprint()) {
    return null;
  }

  return {
    expiresAt: new Date(payload.exp * 1000),
  } satisfies AdminSession;
}
