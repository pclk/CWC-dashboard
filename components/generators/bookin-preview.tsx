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
    <MessageEditor
      initialGeneratedText={initialGeneratedText}
      getRegeneratedText={() => generateBookInMessage(input, templateBody)}
      title="Book-In Message"
    />
  );
}
