import { TemplateType } from "@prisma/client";

export const DEFAULT_SETTINGS_VALUES = {
  unitName: "13/25 C4X",
  defaultParadePrefix:
    "Good morning sirs and ma'am, this is the parade state for {{unitName}}.",
  defaultNightPrefix:
    "Good evening sirs and ma'am, this is the parade state for {{unitName}}.",
  defaultLastParadeText:
    "Good afternoon sirs, can we have last parade at {{time}}H below {{location}}?",
  defaultMtrMorningText:
    "Good morning sirs, MTR is at {{time}}. Do join us if you are free! {{locationSuffix}}",
  defaultMtrAfternoonText:
    "Good afternoon sirs, MTR is at {{time}}. Do join us if you are free! {{locationSuffix}}",
} as const;

export const DEFAULT_TEMPLATE_BODIES: Record<TemplateType, string> = {
  PARADE_MORNING: `{{prefix}}

CAA: {{caaLine}}
=======================
Present Strength: {{presentStrength}}/{{totalStrength}}

Not In Camp:
{{hospitalizationLeave}}x HL:
{{rso}}x RSO
{{mc}}x MC

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}

Status:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
  PARADE_NIGHT: `{{prefix}}

CAA: {{caaLine}}
=======================
Present Strength: {{presentStrength}}/{{totalStrength}}

Not In Camp:
Hospitalisation leave: {{hospitalizationLeave}}
RSO: {{rso}}
MC: {{mc}}

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}

Status:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
  TROOP_MOVEMENT: `{{unitName}} Troop Movement

FROM: {{fromLocation}}
TO: {{toLocation}}

Strength: {{strengthText}}
Arrival Time: {{arrivalTimeText}}

Remarks:
{{remarksBlock}}`,
  MTR_1030: DEFAULT_SETTINGS_VALUES.defaultMtrMorningText,
  MTR_1630: DEFAULT_SETTINGS_VALUES.defaultMtrAfternoonText,
  LAST_PARADE_1730: DEFAULT_SETTINGS_VALUES.defaultLastParadeText,
  MORNING_LAB: `Next timing: {{time}}

Things to bring:
- Comms bag items
- Water Bottle
- Thermometer

Activity: go lab

Attire: S4

Remarks:
- fill ur bottles to full
- rmb to lock ur lockers
- room in SBA condition`,
  FIRST_PARADE: `Next timing: {{time}}

Things to bring:
- Water Bottle
- Thermometer

Activity: FP

Attire: WW

Remarks:
- Please wake up earlier as your restrooms are further away
- ensure ur bunk is in SBA condition
- bring cleaning materials and trash bags and utensils`,
  PT: `Next timing: {{time}}

Things to bring:
- Water Bottle
- Thermometer

Activity: {{activity}}

Attire: PT

Remarks:
- ensure ur bunk is in SBA condition
- ICs remember to bring your phones`,
  CURRENT_AFFAIR_SHARING: `Current Affair Sharing ({{dateRange}})

{{entriesBlock}}`,
  CURRENT_AFFAIR_REMINDER: `sir, is CA sharing at {{time}} today possible?`,
  REQUEST_DI_FP: `Good evening {{recipient}}, {{intro}}permission to have FP {{location}} at {{time}}?`,
  REQUEST_LP: `Good evening {{recipient}}, permission to have LP {{location}} at {{time}}?`,
  BOOK_IN: `{{unitName}} Book-In

=======================
Present Strength: {{presentStrength}}/{{totalStrength}}

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}`,
};

export const LEGACY_DEFAULT_TEMPLATE_BODIES: Partial<Record<TemplateType, readonly string[]>> = {
  PARADE_MORNING: [
    `{{prefix}}

CAA: {{caaLine}}
Strength: {{presentStrength}}/{{totalStrength}}

Not In Camp:
{{hospitalizationLeave}}x HL:
{{rso}}x RSO
{{mc}}x MC

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}

Status:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
    `{{prefix}}

CAA: {{caaLine}}
Strength: {{presentStrength}}/{{totalStrength}}

Not In Camp:
{{hospitalizationLeave}}x HL
{{rso}}x RSO
{{mc}}x MC

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}

Status:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
    `{{prefix}}

CAA: {{caaLine}}
Strength: {{presentStrength}}/{{totalStrength}}

Not In Camp:
Hospitalisation leave: {{hospitalizationLeave}}
RSO: {{rso}}
MC: {{mc}}

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}

Status:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
  ],
  PARADE_NIGHT: [
    `{{prefix}}

CAA: {{caaLine}}
Strength: {{presentStrength}}/{{totalStrength}}

Not In Camp:
Hospitalisation leave: {{hospitalizationLeave}}
RSO: {{rso}}
MC: {{mc}}

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}

Status:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
    `{{prefix}}

CAA: {{caaLine}}
Strength: {{presentStrength}}/{{totalStrength}}

Not In Camp:
{{hospitalizationLeave}}x HL:
{{rso}}x RSO
{{mc}}x MC

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}

Status:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
  ],
  BOOK_IN: [
    `{{unitName}} Book-In

Strength: {{presentStrength}}/{{totalStrength}}

MA/OA:
{{ma_oaBlock}}

MC:
{{mcBlock}}

RSO:
{{rsoBlock}}

RSI:
{{rsiBlock}}

CL:
{{clBlock}}

Others:
{{othersBlock}}`,
  ],
};

export const DEFAULT_TEMPLATE_DEFINITIONS = [
  {
    type: TemplateType.PARADE_MORNING,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.PARADE_MORNING,
    isDefault: true,
  },
  {
    type: TemplateType.PARADE_NIGHT,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.PARADE_NIGHT,
    isDefault: true,
  },
  {
    type: TemplateType.TROOP_MOVEMENT,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.TROOP_MOVEMENT,
    isDefault: true,
  },
  {
    type: TemplateType.MTR_1030,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.MTR_1030,
    isDefault: true,
  },
  {
    type: TemplateType.MTR_1630,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.MTR_1630,
    isDefault: true,
  },
  {
    type: TemplateType.LAST_PARADE_1730,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.LAST_PARADE_1730,
    isDefault: true,
  },
  {
    type: TemplateType.MORNING_LAB,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.MORNING_LAB,
    isDefault: true,
  },
  {
    type: TemplateType.FIRST_PARADE,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.FIRST_PARADE,
    isDefault: true,
  },
  {
    type: TemplateType.PT,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.PT,
    isDefault: true,
  },
  {
    type: TemplateType.CURRENT_AFFAIR_SHARING,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.CURRENT_AFFAIR_SHARING,
    isDefault: true,
  },
  {
    type: TemplateType.CURRENT_AFFAIR_REMINDER,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.CURRENT_AFFAIR_REMINDER,
    isDefault: true,
  },
  {
    type: TemplateType.REQUEST_DI_FP,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.REQUEST_DI_FP,
    isDefault: true,
  },
  {
    type: TemplateType.REQUEST_LP,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.REQUEST_LP,
    isDefault: true,
  },
  {
    type: TemplateType.BOOK_IN,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.BOOK_IN,
    isDefault: true,
  },
] as const;
