import type { Prisma, RecordCategory } from "@prisma/client";

type RecordStatSource = {
  cadetId: string;
  category: RecordCategory;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getRecordStatDate(record: Pick<RecordStatSource, "startAt" | "createdAt">) {
  return record.startAt ?? record.createdAt;
}

function getRecordStatDays(record: Pick<RecordStatSource, "startAt" | "endAt">) {
  if (record.startAt && record.endAt) {
    return Math.max(Math.floor((record.endAt.getTime() - record.startAt.getTime()) / DAY_IN_MS) + 1, 1);
  }

  if (record.startAt || record.endAt) {
    return 1;
  }

  return 0;
}

export async function syncCadetRecordStats(
  tx: Prisma.TransactionClient,
  userId: string,
  cadetIds: string[],
) {
  const scopedCadetIds = [...new Set(cadetIds.filter(Boolean))];

  if (!scopedCadetIds.length) {
    return;
  }

  const records = await tx.cadetRecord.findMany({
    where: {
      userId,
      cadetId: {
        in: scopedCadetIds,
      },
    },
    select: {
      cadetId: true,
      category: true,
      startAt: true,
      endAt: true,
      createdAt: true,
    },
  });

  const stats = new Map<
    string,
    {
      cadetId: string;
      category: RecordStatSource["category"];
      recordCount: number;
      totalDays: number;
      firstRecordAt: Date;
    }
  >();

  for (const record of records) {
    const key = `${record.cadetId}:${record.category}`;
    const recordDate = getRecordStatDate(record);
    const existingStat = stats.get(key);

    if (!existingStat) {
      stats.set(key, {
        cadetId: record.cadetId,
        category: record.category,
        recordCount: 1,
        totalDays: getRecordStatDays(record),
        firstRecordAt: recordDate,
      });
      continue;
    }

    existingStat.recordCount += 1;
    existingStat.totalDays += getRecordStatDays(record);
    if (recordDate < existingStat.firstRecordAt) {
      existingStat.firstRecordAt = recordDate;
    }
  }

  await tx.cadetRecordStat.deleteMany({
    where: {
      userId,
      cadetId: {
        in: scopedCadetIds,
      },
    },
  });

  const nextStats = Array.from(stats.values());

  if (!nextStats.length) {
    return;
  }

  await tx.cadetRecordStat.createMany({
    data: nextStats.map((stat) => ({
      userId,
      cadetId: stat.cadetId,
      category: stat.category,
      recordCount: stat.recordCount,
      totalDays: stat.totalDays,
      firstRecordAt: stat.firstRecordAt,
    })),
  });
}

export async function syncUserCadetRecordStats(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const cadets = await tx.cadet.findMany({
    where: { userId },
    select: { id: true },
  });

  await syncCadetRecordStats(
    tx,
    userId,
    cadets.map((cadet) => cadet.id),
  );
}
