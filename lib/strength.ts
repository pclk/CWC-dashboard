import type { RecordCategory, ResolutionState } from "@prisma/client";

export function deriveResolutionState(
  record: {
    endAt: Date | null;
    resolutionState: "ACTIVE" | "EXPIRED_PENDING_CONFIRMATION" | "RESOLVED";
  },
  now = new Date(),
) {
  if (record.resolutionState === "RESOLVED") return "RESOLVED";
  if (record.endAt && record.endAt < now) return "EXPIRED_PENDING_CONFIRMATION";
  return "ACTIVE";
}

export const OPERATIONAL_RECORD_STATES: ResolutionState[] = [
  "ACTIVE",
  "EXPIRED_PENDING_CONFIRMATION",
];

export const CATEGORY_DEFAULTS: Record<
  RecordCategory,
  { affectsStrength: boolean; countsNotInCamp: boolean }
> = {
  MA_OA: { affectsStrength: true, countsNotInCamp: true },
  MC: { affectsStrength: true, countsNotInCamp: true },
  RSO: { affectsStrength: true, countsNotInCamp: true },
  RSI: { affectsStrength: false, countsNotInCamp: false },
  CL: { affectsStrength: true, countsNotInCamp: true },
  HL: { affectsStrength: true, countsNotInCamp: true },
  OTHER: { affectsStrength: false, countsNotInCamp: false },
  STATUS_RESTRICTION: { affectsStrength: false, countsNotInCamp: false },
};

export function getRecordCategoryDefaults(category: RecordCategory) {
  return CATEGORY_DEFAULTS[category];
}

export function buildAbsentCadetIds(
  records: Array<{
    cadetId: string;
    affectsStrength: boolean;
  }>,
) {
  return new Set(records.filter((record) => record.affectsStrength).map((record) => record.cadetId));
}

export function computeNotInCampCounts(
  records: Array<{
    cadetId: string;
    category: RecordCategory;
    countsNotInCamp: boolean;
  }>,
) {
  const buckets = {
    hospitalizationLeave: new Set<string>(),
    rso: new Set<string>(),
    mc: new Set<string>(),
    other: new Set<string>(),
  };

  for (const record of records) {
    if (!record.countsNotInCamp) {
      continue;
    }

    if (record.category === "HL") {
      buckets.hospitalizationLeave.add(record.cadetId);
      continue;
    }

    if (record.category === "RSO") {
      buckets.rso.add(record.cadetId);
      continue;
    }

    if (record.category === "MC") {
      buckets.mc.add(record.cadetId);
      continue;
    }

    buckets.other.add(record.cadetId);
  }

  return {
    hospitalizationLeave: buckets.hospitalizationLeave.size,
    rso: buckets.rso.size,
    mc: buckets.mc.size,
    other: buckets.other.size,
  };
}
