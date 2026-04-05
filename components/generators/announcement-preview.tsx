"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateAnnouncementDraftAction } from "@/actions/generator-drafts";
import { MessageEditor } from "@/components/generators/message-editor";
import {
  generateLastParadeMessage,
  generateMtrAnnouncementMessage,
} from "@/lib/generators/announcements";

type AnnouncementPreviewProps = {
  draftType: "MTR_1030" | "MTR_1630" | "LAST_PARADE_1730";
  title: string;
  templateBody: string;
  defaultTime: string;
  defaultLocation?: string;
  initialTime?: string | null;
  initialLocation?: string | null;
  requireLocation?: boolean;
  mode: "mtr" | "last-parade";
};

export function AnnouncementPreview({
  draftType,
  title,
  templateBody,
  defaultTime,
  defaultLocation = "",
  initialTime = null,
  initialLocation = null,
  requireLocation = false,
  mode,
}: AnnouncementPreviewProps) {
  const [time, setTime] = useState(initialTime ?? defaultTime);
  const [location, setLocation] = useState(initialLocation ?? defaultLocation);
  const [pending, startTransition] = useTransition();
  const lastSavedDraftRef = useRef(
    JSON.stringify({
      time: initialTime ?? defaultTime,
      location: initialLocation ?? defaultLocation,
    }),
  );

  useEffect(() => {
    const nextDraft = JSON.stringify({ time, location });

    if (nextDraft === lastSavedDraftRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const result = await updateAnnouncementDraftAction({
          type: draftType,
          time,
          location,
        });

        if (result.ok) {
          lastSavedDraftRef.current = nextDraft;
        }
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [draftType, location, startTransition, time]);

  function generateMessage() {
    if (mode === "last-parade") {
      return generateLastParadeMessage(templateBody, {
        time,
        location,
      });
    }

    return generateMtrAnnouncementMessage(templateBody, {
      time,
      location,
    });
  }

  const initialGeneratedText = generateMessage();

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Time</label>
          <input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            {requireLocation ? "Location" : "Location Suffix"}
          </label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={requireLocation ? "below 315e" : "optional"}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>
      </div>

      <div className="mt-5">
        <MessageEditor
          initialGeneratedText={initialGeneratedText}
          getRegeneratedText={() => generateMessage()}
          title={`${title} Message`}
        />
      </div>

      {pending ? <p className="mt-3 text-xs text-slate-500">Saving draft...</p> : null}
    </section>
  );
}
