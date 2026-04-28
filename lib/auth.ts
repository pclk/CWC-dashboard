import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getSessionDeviceMetadata } from "@/lib/session-metadata";
import { loginSchema } from "@/lib/validators/auth";

const SESSION_LAST_SEEN_WRITE_INTERVAL_MS = 60_000;
const SESSION_PASSWORD_FINGERPRINT_PREFIX = "cwc-dashboard-session-password-v1";
const CWC_APPOINTMENT_HOLDER = "CWC";

function getSessionPasswordFingerprint(passwordHash: string) {
  return createHash("sha256")
    .update(`${SESSION_PASSWORD_FINGERPRINT_PREFIX}:${passwordHash}`)
    .digest("hex");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/cwc/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        cadetIdentifier: { label: "Cadet name or shorthand", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const cadet = await prisma.cadet.findFirst({
          where: {
            active: true,
            appointmentHolder: CWC_APPOINTMENT_HOLDER,
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
            user: {
              select: {
                batchName: true,
              },
            },
          },
        });

        if (
          !cadet ||
          !cadet.passwordHash ||
          cadet.appointmentHolder !== CWC_APPOINTMENT_HOLDER
        ) {
          return null;
        }

        if (!(await bcrypt.compare(parsed.data.password, cadet.passwordHash))) {
          return null;
        }

        const deviceMetadata = getSessionDeviceMetadata(request);
        const signedInAt = new Date();
        const userSession = await prisma.userSession.create({
          data: {
            userId: cadet.userId,
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

        return {
          id: cadet.userId,
          name: cadet.displayName,
          displayName: cadet.displayName,
          batchName: cadet.user.batchName,
          cadetId: cadet.id,
          cadetDisplayName: cadet.displayName,
          appointmentHolder: cadet.appointmentHolder,
          sessionId: userSession.id,
          sessionPasswordFingerprint: getSessionPasswordFingerprint(cadet.passwordHash),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.sessionId = user.sessionId ?? null;
        token.displayName = user.displayName ?? user.name ?? null;
        token.batchName = user.batchName ?? null;
        token.cadetId = user.cadetId ?? null;
        token.cadetDisplayName = user.cadetDisplayName ?? user.displayName ?? user.name ?? null;
        token.appointmentHolder = user.appointmentHolder ?? null;
        token.sessionPasswordFingerprint = user.sessionPasswordFingerprint ?? null;
        return token.sessionId && token.cadetId && token.sessionPasswordFingerprint ? token : null;
      }

      if (!token.userId || !token.sessionId || !token.cadetId || !token.sessionPasswordFingerprint) {
        return null;
      }

      const userSession = await prisma.userSession.findUnique({
        where: { id: String(token.sessionId) },
        select: {
          id: true,
          userId: true,
          lastSeenAt: true,
          revokedAt: true,
          user: {
            select: {
              batchName: true,
            },
          },
        },
      });

      if (!userSession || userSession.revokedAt || userSession.userId !== token.userId) {
        return null;
      }

      const cadet = await prisma.cadet.findUnique({
        where: { id: String(token.cadetId) },
        select: {
          id: true,
          userId: true,
          displayName: true,
          active: true,
          appointmentHolder: true,
          passwordHash: true,
        },
      });

      if (
        !cadet ||
        cadet.userId !== token.userId ||
        !cadet.active ||
        cadet.appointmentHolder !== CWC_APPOINTMENT_HOLDER ||
        !cadet.passwordHash
      ) {
        await prisma.userSession.updateMany({
          where: {
            id: userSession.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedReason: "CWC_ACCESS_REVOKED",
          },
        });

        return null;
      }

      const currentPasswordFingerprint = getSessionPasswordFingerprint(cadet.passwordHash);

      if (token.sessionPasswordFingerprint !== currentPasswordFingerprint) {
        await prisma.userSession.updateMany({
          where: {
            id: userSession.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedReason: "CADET_PASSWORD_CHANGED",
          },
        });

        return null;
      }

      const now = new Date();

      if (now.getTime() - userSession.lastSeenAt.getTime() > SESSION_LAST_SEEN_WRITE_INTERVAL_MS) {
        await prisma.userSession.updateMany({
          where: {
            id: userSession.id,
            revokedAt: null,
          },
          data: {
            lastSeenAt: now,
          },
        });
      }

      token.name = cadet.displayName;
      token.displayName = cadet.displayName;
      token.batchName = userSession.user.batchName;
      token.cadetId = cadet.id;
      token.cadetDisplayName = cadet.displayName;
      token.appointmentHolder = cadet.appointmentHolder;

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId && token.sessionId) {
        session.user.id = String(token.userId);
        session.user.sessionId = String(token.sessionId);
        session.user.name =
          typeof token.displayName === "string" ? token.displayName : session.user.name;
        session.user.batchName =
          typeof token.batchName === "string" ? token.batchName : session.user.batchName;
        session.user.cadetId = typeof token.cadetId === "string" ? token.cadetId : null;
        session.user.cadetDisplayName =
          typeof token.cadetDisplayName === "string" ? token.cadetDisplayName : null;
        session.user.appointmentHolder =
          typeof token.appointmentHolder === "string" ? token.appointmentHolder : null;
      }

      return session;
    },
  },
  events: {
    async signOut(message) {
      const sessionId =
        "token" in message && typeof message.token?.sessionId === "string"
          ? message.token.sessionId
          : null;

      if (!sessionId) {
        return;
      }

      await prisma.userSession.updateMany({
        where: {
          id: sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: "SIGNED_OUT",
        },
      });
    },
  },
});
