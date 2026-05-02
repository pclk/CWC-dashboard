import { getCetTemplateEditorData } from "@/actions/cet-templates";
import { CetTemplateEditor } from "@/components/cet/cet-template-editor";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { requireCwcUser } from "@/lib/session";

export default async function CwcCetTemplatesPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    await requireCwcUser();
    const templateData = await getCetTemplateEditorData();

    return <CetTemplateEditor initialData={templateData} dailyHref="/cwc/cet" />;
  });
}
