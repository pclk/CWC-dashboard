"use client";

import { useState } from "react";

export function CopyShareBar({ text }: { text: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function onCopy() {
    await navigator.clipboard.writeText(text);
    setStatus("Copied");
    window.setTimeout(() => setStatus(null), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Copy
      </button>
      {status ? <span className="text-xs font-medium text-slate-500">{status}</span> : null}
    </div>
  );
}
