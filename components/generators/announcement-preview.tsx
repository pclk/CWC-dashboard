"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateAnnouncementDraftAction } from "@/actions/generator-drafts";
import { type AnnouncementDraftType } from "@/lib/announcement-config";
import { MessageEditor } from "@/components/generators/message-editor";
import {
  generateLastParadeMessage,
  generateMtrAnnouncementMessage,
  generateRoutineAnnouncementMessage,
  getMorningLabDefaultTime,
  PT_ACTIVITY_SUGGESTIONS,
} from "@/lib/generators/announcements";

type AnnouncementPreviewProps = {
  id?: string;
  draftType: AnnouncementDraftType;
  title: string;
  templateBody: string;
  defaultTime: string;
  defaultLocation?: string;
  initialTime?: string | null;
  initialLocation?: string | null;
  defaultActivity?: string;
  initialActivity?: string | null;
  initialIsPtDay?: boolean;
  enablePtDayToggle?: boolean;
  requireLocation?: boolean;
  activitySuggestions?: readonly string[];
  mode: "mtr" | "last-parade" | "routine" | "routine-with-activity";
};

export function AnnouncementPreview({
  id,
  draftType,
  title,
  templateBody,
  defaultTime,
  defaultLocation = "",
  initialTime = null,
  initialLocation = null,
  defaultActivity = "",
  initialActivity = null,
  initialIsPtDay = false,
  enablePtDayToggle = false,
  requireLocation = false,
  activitySuggestions = PT_ACTIVITY_SUGGESTIONS,
  mode,
}: AnnouncementPreviewProps) {
  const resolvedDefaultTime =
    enablePtDayToggle ? getMorningLabDefaultTime(initialIsPtDay) : defaultTime;
  const [time, setTime] = useState(initialTime ?? resolvedDefaultTime);
  const [location, setLocation] = useState(initialLocation ?? defaultLocation);
  const [activity, setActivity] = useState(initialActivity ?? defaultActivity);
  const [isPtDay, setIsPtDay] = useState(initialIsPtDay);
  const [pending, startTransition] = useTransition();
  const lastSavedDraftRef = useRef(
    JSON.stringify({
      time: initialTime ?? resolvedDefaultTime,
      location: initialLocation ?? defaultLocation,
      activity: initialActivity ?? defaultActivity,
      isPtDay: initialIsPtDay,
    }),
  );

  useEffect(() => {
    const nextDraft = JSON.stringify({ time, location, activity, isPtDay });

    if (nextDraft === lastSavedDraftRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const result = await updateAnnouncementDraftAction({
          type: draftType,
          time,
          location,
          activity,
          isPtDay,
        });

        if (result.ok) {
          lastSavedDraftRef.current = nextDraft;
        }
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [activity, draftType, isPtDay, location, startTransition, time]);

  function handlePtDayToggle(nextValue: boolean) {
    setIsPtDay(nextValue);
    setTime(getMorningLabDefaultTime(nextValue));
  }

  function generateMessage() {
    if (mode === "last-parade") {
      return generateLastParadeMessage(templateBody, {
        time,
        location,
      });
    }

    if (mode === "mtr") {
      return generateMtrAnnouncementMessage(templateBody, {
        time,
        location,
      });
    }

    return generateRoutineAnnouncementMessage(templateBody, {
      time,
      activity,
    });
  }

  const initialGeneratedText = generateMessage();
  const activityListId = `${draftType.toLowerCase()}-activities`;
  const showLocationField = mode === "mtr" || mode === "last-parade";
  const showActivityField = mode === "routine-with-activity";
  const locationLabel = mode === "mtr" ? "Location Suffix" : "Location";
  const locationPlaceholder = requireLocation ? "below 315e" : "optional";

  return (
    <section id={id} className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

      <div
        className={`mt-4 grid gap-4 ${
          showLocationField || showActivityField ? "md:grid-cols-2" : ""
        }`}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Time</label>
          <input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        {showLocationField ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">{locationLabel}</label>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={locationPlaceholder}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
        ) : null}

        {showActivityField ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Activity</label>
            <input
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              list={activityListId}
              placeholder="DI"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
            <datalist id={activityListId}>
              {activitySuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>
        ) : null}
      </div>

      {enablePtDayToggle ? (
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPtDay}
            onChange={(event) => handlePtDayToggle(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          Today is PT. Toggle to use {isPtDay ? "1015" : "0745"} as the default morning lab timing.
        </label>
      ) : null}

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
