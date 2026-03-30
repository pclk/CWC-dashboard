import { TemplateType } from "@prisma/client";

export const DEFAULT_SETTINGS_VALUES = {
  unitName: "13/25 C4X",
  defaultParadePrefix: "Good morning sirs and ma'am, this is the parade state for {{unitName}}.",
  defaultNightPrefix: "Good evening sirs and ma'am, this is the parade state for {{unitName}}.",
  defaultLastParadeText: "Good afternoon sirs, can we have last parade at {{time}}H below {{location}}?",
  defaultMtrMorningText: "Good morning sirs, MTR is at {{time}}. Do join us if you are free! {{locationSuffix}}",
  defaultMtrAfternoonText:
    "Good afternoon sirs, MTR is at {{time}}. Do join us if you are free! {{locationSuffix}}",
} as const;

export const DEFAULT_TEMPLATE_BODIES: Record<TemplateType, string> = {
  PARADE_MORNING: `{{prefix}}

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

Status Restrictions:
{{statusBlock}}

Upcoming Appointments:
{{appointmentsBlock}}`,
  PARADE_NIGHT: `{{prefix}}

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

Status Restrictions:
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
  BOOK_IN: `{{unitName}} Book-In

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
    type: TemplateType.BOOK_IN,
    name: "Default",
    body: DEFAULT_TEMPLATE_BODIES.BOOK_IN,
    isDefault: true,
  },
] as const;
