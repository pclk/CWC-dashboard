import { SettingsForm } from "@/components/settings/settings-form";
import { getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const userId = await requireUser();
  const { settings, templates } = await getSettingsAndTemplates(userId);

  return <SettingsForm settings={settings} templates={templates} />;
}
