import { Prisma } from "@prisma/client";
import type { ReactNode } from "react";

import { DatabaseWakeupState } from "@/components/database/database-wakeup-state";

const RETRYABLE_DATABASE_ERROR_PATTERNS = [
  /can't reach database server/i,
  /database system is starting up/i,
  /connection terminated unexpectedly/i,
  /server closed the connection unexpectedly/i,
  /connection error/i,
  /connect econnrefused/i,
  /connect etimedout/i,
  /econnreset/i,
  /econnrefused/i,
  /etimedout/i,
  /the server is in recovery mode/i,
];

const RETRYABLE_DATABASE_ERROR_CODES = new Set([
  "P1001",
  "57P03",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
]);

function collectErrorStrings(error: unknown, seen = new Set<unknown>()): string[] {
  if (!error || seen.has(error)) {
    return [];
  }

  if (typeof error === "string") {
    return [error];
  }

  if (Array.isArray(error)) {
    seen.add(error);
    return error.flatMap((item) => collectErrorStrings(item, seen));
  }

  if (typeof error !== "object") {
    return [];
  }

  seen.add(error);

  const values: string[] = [];
  const candidate = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    errorCode?: unknown;
    cause?: unknown;
    meta?: unknown;
    error?: unknown;
    reason?: unknown;
  };

  if (typeof candidate.name === "string") {
    values.push(candidate.name);
  }

  if (typeof candidate.message === "string") {
    values.push(candidate.message);
  }

  if (typeof candidate.code === "string") {
    values.push(candidate.code);
  }

  if (typeof candidate.errorCode === "string") {
    values.push(candidate.errorCode);
  }

  for (const nested of [candidate.cause, candidate.meta, candidate.error, candidate.reason]) {
    values.push(...collectErrorStrings(nested, seen));
  }

  return values;
}

export function isDatabaseWakeupError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    RETRYABLE_DATABASE_ERROR_CODES.has(error.code)
  ) {
    return true;
  }

  const errorText = collectErrorStrings(error).join("\n");

  if (!errorText) {
    return false;
  }

  if (Array.from(RETRYABLE_DATABASE_ERROR_CODES).some((code) => errorText.includes(code))) {
    return true;
  }

  return RETRYABLE_DATABASE_ERROR_PATTERNS.some((pattern) => pattern.test(errorText));
}

export async function renderWithDatabaseWakeupFallback(
  render: () => Promise<ReactNode>,
  options?: {
    fullscreen?: boolean;
  },
) {
  try {
    return await render();
  } catch (error) {
    if (isDatabaseWakeupError(error)) {
      return <DatabaseWakeupState fullscreen={options?.fullscreen} />;
    }

    throw error;
  }
}
