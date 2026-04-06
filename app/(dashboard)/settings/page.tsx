import { TemplateType } from "@prisma/client";

import { SettingsForm } from "@/components/settings/settings-form";
import { getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";

export default async function SettingsPage() {
  const userId = await requireUser();
  const { settings, templates } = await getSettingsAndTemplates(userId);

  return (
    <SettingsForm
      settings={settings}
      templates={templates
        .filter((template) => template.type !== TemplateType.PARADE_NIGHT)
        .map((template) => ({
          ...template,
          displayType:
            template.type === TemplateType.PARADE_MORNING ? "PARADE_STATE" : template.type,
          defaultBody: DEFAULT_TEMPLATE_BODIES[template.type],
        }))}
    />
  );
}
