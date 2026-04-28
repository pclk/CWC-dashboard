import type { Prisma, RecordCategory } from "@prisma/client";

type RecordStatSource = {
  cadetId: string;
  category: RecordCategory;
  startAt: Date | null;
  createdAt: Date;
};

function getRecordStatDate(record: Pick<RecordStatSource, "startAt" | "createdAt">) {
  return record.startAt ?? record.createdAt;
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
      createdAt: true,
    },
  });

  const stats = new Map<
    string,
    {
      cadetId: string;
      category: RecordStatSource["category"];
      recordCount: number;
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
        firstRecordAt: recordDate,
      });
      continue;
    }

    existingStat.recordCount += 1;
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
      firstRecordAt: stat.firstRecordAt,
    })),
  });
}
