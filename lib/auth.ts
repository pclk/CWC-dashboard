import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getSessionDeviceMetadata } from "@/lib/session-metadata";
import { loginSchema } from "@/lib/validators/auth";

const SESSION_LAST_SEEN_WRITE_INTERVAL_MS = 60_000;
const SESSION_PASSWORD_FINGERPRINT_PREFIX = "cwc-dashboard-session-password-v1";

function getSessionPasswordFingerprint(passwordHash: string) {
  return createHash("sha256")
    .update(`${SESSION_PASSWORD_FINGERPRINT_PREFIX}:${passwordHash}`)
    .digest("hex");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        batchName: { label: "Batch name", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { batchName: parsed.data.batchName },
        });

        if (!user) {
          return null;
        }

        if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
          return null;
        }

        const deviceMetadata = getSessionDeviceMetadata(request);
        const signedInAt = new Date();
        const userSession = await prisma.userSession.create({
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

        return {
          id: user.id,
          name: user.displayName ?? user.batchName,
          displayName: user.displayName,
          batchName: user.batchName,
          sessionId: userSession.id,
          sessionPasswordFingerprint: getSessionPasswordFingerprint(user.passwordHash),
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
        token.sessionPasswordFingerprint = user.sessionPasswordFingerprint ?? null;
        return token.sessionId && token.sessionPasswordFingerprint ? token : null;
      }

      if (!token.userId || !token.sessionId || !token.sessionPasswordFingerprint) {
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
              displayName: true,
              passwordHash: true,
            },
          },
        },
      });

      if (!userSession || userSession.revokedAt || userSession.userId !== token.userId) {
        return null;
      }

      const currentPasswordFingerprint = getSessionPasswordFingerprint(
        userSession.user.passwordHash,
      );

      if (token.sessionPasswordFingerprint !== currentPasswordFingerprint) {
        await prisma.userSession.updateMany({
          where: {
            id: userSession.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            revokedReason: "PASSWORD_CHANGED",
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

      token.name = userSession.user.displayName ?? userSession.user.batchName;
      token.displayName = userSession.user.displayName;
      token.batchName = userSession.user.batchName;

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
