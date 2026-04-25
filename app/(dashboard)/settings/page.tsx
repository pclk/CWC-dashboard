import { TemplateType } from "@prisma/client";

import { SettingsForm } from "@/components/settings/settings-form";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { getSettingsAndTemplates, getUserLoginSessions } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";

export default async function SettingsPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const user = await requirePageUser();
    const [{ settings, templates }, loginSessions] = await Promise.all([
      getSettingsAndTemplates(user.id),
      getUserLoginSessions(user.id),
    ]);

    return (
      <SettingsForm
        settings={settings}
        currentSessionId={user.sessionId}
        loginSessions={loginSessions.map((session) => ({
          ...session,
          signedInAt: session.signedInAt.toISOString(),
          lastSeenAt: session.lastSeenAt.toISOString(),
          revokedAt: session.revokedAt?.toISOString() ?? null,
        }))}
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
  });
}
