import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

export function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export function parseOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function revalidateOperationalPages() {
  revalidatePath("/dashboard");
  revalidatePath("/cadets");
  revalidatePath("/records");
  revalidatePath("/appointments");
  revalidatePath("/bunks");
  revalidatePath("/announcements");
  revalidatePath("/parade-state");
  revalidatePath("/troop-movement");
  revalidatePath("/book-in");
  revalidatePath("/duty-instructors");
}

export function success(message: string): ActionResult {
  return {
    ok: true,
    message,
  };
}

export function failure(error: string): ActionResult {
  return {
    ok: false,
    error,
  };
}
