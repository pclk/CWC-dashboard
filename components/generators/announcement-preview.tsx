"use client";

import { useEffect, useState } from "react";

import { MessageEditor } from "@/components/generators/message-editor";
import {
  generateLastParadeMessage,
  generateMtrAnnouncementMessage,
} from "@/lib/generators/announcements";

type AnnouncementPreviewProps = {
  storageKey: string;
  title: string;
  templateBody: string;
  defaultTime: string;
  defaultLocation?: string;
  requireLocation?: boolean;
  mode: "mtr" | "last-parade";
};

export function AnnouncementPreview({
  storageKey,
  title,
  templateBody,
  defaultTime,
  defaultLocation = "",
  requireLocation = false,
  mode,
}: AnnouncementPreviewProps) {
  const [time, setTime] = useState(defaultTime);
  const [location, setLocation] = useState(defaultLocation);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { time?: string; location?: string };
        window.setTimeout(() => {
          if (parsed.time) setTime(parsed.time);
          if (parsed.location) setLocation(parsed.location);
        }, 0);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    window.setTimeout(() => {
      setReady(true);
    }, 0);
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ time, location }));
  }, [location, ready, storageKey, time]);

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
    </section>
  );
}
