import { CetVisibility, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type CetOption = {
  name: string;
};

type CetTemplateBlockSeed = {
  startTime: string;
  endTime: string;
  title: string;
  activityType: "LAB" | "PT" | "BUNK" | "COOKHOUSE" | "MEDICAL" | "OTHER";
  venueName: string;
  attireName: string;
  requiredItems?: string;
  remarks?: string;
};

type CetTemplateSeed = {
  name: string;
  blocks: CetTemplateBlockSeed[];
};

const DEFAULT_VENUES: CetOption[] = [
  { name: "Lab" },
  { name: "Parade Square" },
  { name: "Bunk" },
  { name: "Cookhouse" },
  { name: "Medical Centre" },
];

const DEFAULT_ATTIRE: CetOption[] = [
  { name: "Smart 4" },
  { name: "PT Kit" },
  { name: "Admin" },
];

const DEFAULT_TEMPLATES: CetTemplateSeed[] = [
  {
    name: "Usual Lab",
    blocks: [
      {
        startTime: "07:30",
        endTime: "08:00",
        title: "First Parade",
        activityType: "OTHER",
        venueName: "Parade Square",
        attireName: "Smart 4",
        requiredItems: "Water bottle",
        remarks: "Confirm attendance and daily instructions.",
      },
      {
        startTime: "08:00",
        endTime: "12:00",
        title: "Lab",
        activityType: "LAB",
        venueName: "Lab",
        attireName: "Smart 4",
        requiredItems: "Laptop, charger, water bottle",
        remarks: "Usual lab training.",
      },
      {
        startTime: "12:00",
        endTime: "13:00",
        title: "Lunch",
        activityType: "COOKHOUSE",
        venueName: "Cookhouse",
        attireName: "Smart 4",
      },
      {
        startTime: "13:00",
        endTime: "17:30",
        title: "Lab",
        activityType: "LAB",
        venueName: "Lab",
        attireName: "Smart 4",
        requiredItems: "Laptop, charger, water bottle",
        remarks: "Continue lab training.",
      },
    ],
  },
  {
    name: "Usual PT + Lab",
    blocks: [
      {
        startTime: "07:30",
        endTime: "08:30",
        title: "PT",
        activityType: "PT",
        venueName: "Parade Square",
        attireName: "PT Kit",
        requiredItems: "Water bottle",
        remarks: "Usual physical training.",
      },
      {
        startTime: "08:30",
        endTime: "09:00",
        title: "Change Up",
        activityType: "BUNK",
        venueName: "Bunk",
        attireName: "Admin",
        remarks: "Prepare for lab training.",
      },
      {
        startTime: "09:00",
        endTime: "12:00",
        title: "Lab",
        activityType: "LAB",
        venueName: "Lab",
        attireName: "Smart 4",
        requiredItems: "Laptop, charger, water bottle",
        remarks: "Lab training after PT.",
      },
      {
        startTime: "12:00",
        endTime: "13:00",
        title: "Lunch",
        activityType: "COOKHOUSE",
        venueName: "Cookhouse",
        attireName: "Smart 4",
      },
      {
        startTime: "13:00",
        endTime: "17:30",
        title: "Lab",
        activityType: "LAB",
        venueName: "Lab",
        attireName: "Smart 4",
        requiredItems: "Laptop, charger, water bottle",
        remarks: "Continue lab training.",
      },
    ],
  },
];

async function upsertVenues(tx: Prisma.TransactionClient, userId: string) {
  const entries: Array<{ id: string; name: string }> = [];

  for (const venue of DEFAULT_VENUES) {
    entries.push(
      await tx.cetVenue.upsert({
        where: { userId_name: { userId, name: venue.name } },
        update: {},
        create: { userId, name: venue.name },
        select: { id: true, name: true },
      }),
    );
  }

  return new Map(entries.map((entry) => [entry.name, entry.id]));
}

async function upsertAttire(tx: Prisma.TransactionClient, userId: string) {
  const entries: Array<{ id: string; name: string }> = [];

  for (const attire of DEFAULT_ATTIRE) {
    entries.push(
      await tx.cetAttire.upsert({
        where: { userId_name: { userId, name: attire.name } },
        update: {},
        create: { userId, name: attire.name },
        select: { id: true, name: true },
      }),
    );
  }

  return new Map(entries.map((entry) => [entry.name, entry.id]));
}

function buildTemplateBlockCreateData(
  block: CetTemplateBlockSeed,
  venueIds: Map<string, string>,
  attireIds: Map<string, string>,
) {
  return {
    title: block.title,
    activityType: block.activityType,
    venueId: venueIds.get(block.venueName),
    attireId: attireIds.get(block.attireName),
    requiredItems: block.requiredItems ?? null,
    remarks: block.remarks ?? null,
    startTime: block.startTime,
    endTime: block.endTime,
    visibility: CetVisibility.COHORT,
  };
}

export async function ensureCetConfiguration(userId: string) {
  await prisma.$transaction(async (tx) => {
    const venueIds = await upsertVenues(tx, userId);
    const attireIds = await upsertAttire(tx, userId);

    for (const template of DEFAULT_TEMPLATES) {
      await tx.cetTemplate.upsert({
        where: { userId_name: { userId, name: template.name } },
        update: {},
        create: {
          userId,
          name: template.name,
          blocks: {
            create: template.blocks.map((block) =>
              buildTemplateBlockCreateData(block, venueIds, attireIds),
            ),
          },
        },
      });
    }
  });
}
