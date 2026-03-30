"use client";

import { MessageEditor } from "@/components/generators/message-editor";
import { generateBookInMessage, type BookInInput } from "@/lib/generators/book-in";

export function BookInPreview({
  input,
  templateBody,
}: {
  input: BookInInput;
  templateBody: string;
}) {
  const initialGeneratedText = generateBookInMessage(input, templateBody);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Present Strength</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{input.presentStrength}</p>
        </div>
        <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Strength</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{input.totalStrength}</p>
        </div>
        <div className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Unit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{input.unitName}</p>
        </div>
      </section>

      <MessageEditor
        initialGeneratedText={initialGeneratedText}
        getRegeneratedText={() => generateBookInMessage(input, templateBody)}
        title="Book-In Message"
      />
    </div>
  );
}
