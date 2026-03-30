import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators/auth";

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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = loginSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.email,
          displayName: user.displayName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.displayName = user.displayName ?? user.name ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = String(token.userId);
        session.user.name =
          typeof token.displayName === "string" ? token.displayName : session.user.name;
      }

      return session;
    },
  },
});
