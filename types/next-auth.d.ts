import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      sessionId: string;
      cadetId?: string | null;
      cadetDisplayName?: string | null;
      appointmentHolder?: string | null;
      batchName?: string | null;
    };
  }

  interface User {
    id: string;
    sessionId?: string | null;
    displayName?: string | null;
    batchName?: string | null;
    cadetId?: string | null;
    cadetDisplayName?: string | null;
    appointmentHolder?: string | null;
    sessionPasswordFingerprint?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    sessionId?: string | null;
    displayName?: string | null;
    batchName?: string | null;
    cadetId?: string | null;
    cadetDisplayName?: string | null;
    appointmentHolder?: string | null;
    sessionPasswordFingerprint?: string | null;
  }
}
