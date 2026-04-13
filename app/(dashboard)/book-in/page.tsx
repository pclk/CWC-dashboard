import { BookInPreview } from "@/components/generators/bookin-preview";
import { renderWithDatabaseWakeupFallback } from "@/lib/database-wakeup";
import { buildBookInInput, getSettingsAndTemplates } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function BookInPage() {
  return renderWithDatabaseWakeupFallback(async () => {
    const userId = await requireUser();
    const [input, settingsBundle] = await Promise.all([
      buildBookInInput(userId),
      getSettingsAndTemplates(userId),
    ]);

    return (
      <div className="space-y-4">
        <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Book-In</h1>
          <p className="mt-2 text-sm text-slate-600">
            A leaner operational summary generated from the same records and roster tables.
          </p>
        </section>

        <BookInPreview input={input} templateBody={settingsBundle.templateMap.BOOK_IN} />
      </div>
    );
  });
}
