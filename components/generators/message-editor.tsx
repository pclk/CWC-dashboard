"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { CopyShareBar } from "@/components/generators/copy-share-bar";

type SaveResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export function MessageEditor({
  initialGeneratedText,
  getRegeneratedText,
  onSave,
  saveLabel = "Save",
  title = "Generated Message",
}: {
  initialGeneratedText: string;
  getRegeneratedText: () => string | Promise<string>;
  onSave?: (text: string) => Promise<SaveResult>;
  saveLabel?: string;
  title?: string;
}) {
  const [generatedText, setGeneratedText] = useState(initialGeneratedText);
  const [editorText, setEditorText] = useState(initialGeneratedText);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!dirty) {
      const timeoutId = window.setTimeout(() => {
        setGeneratedText(initialGeneratedText);
        setEditorText(initialGeneratedText);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [initialGeneratedText, dirty]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [editorText]);

  function onChange(value: string) {
    setEditorText(value);
    setDirty(value !== generatedText);
  }

  function onRegenerate(next: string) {
    setGeneratedText(next);
    setEditorText(next);
    setDirty(false);
  }

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">
            The copied text is the edited final text, not the raw generated draft.
          </p>
        </div>
        {dirty ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Local edits pending
          </span>
        ) : null}
      </div>

      <textarea
        ref={textareaRef}
        value={editorText}
        onChange={(event) => onChange(event.target.value)}
        rows={1}
        className="mt-4 w-full resize-none overflow-hidden rounded-[1.5rem] border border-black/10 bg-white px-4 py-4 font-mono text-sm leading-6 outline-none focus:border-teal-700"
      />

      {status ? (
        <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{status}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (dirty && !window.confirm("Regenerate and replace local edits?")) {
              return;
            }

            startTransition(async () => {
              const next = await getRegeneratedText();
              onRegenerate(next);
              setStatus("Regenerated from current inputs.");
            });
          }}
          className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          Regenerate
        </button>

        <CopyShareBar text={editorText} />

        {onSave ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await onSave(editorText);
                setStatus(result.ok ? result.message ?? "Saved." : result.error ?? "Unable to save.");
              });
            }}
            className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {saveLabel}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (dirty && !window.confirm("Clear local edits and revert to the generated text?")) {
              return;
            }

            setEditorText(generatedText);
            setDirty(false);
            setStatus("Local edits cleared.");
          }}
          className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Clear Local Edits
        </button>
      </div>
    </section>
  );
}
