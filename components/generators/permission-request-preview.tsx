"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateAnnouncementDraftAction } from "@/actions/generator-drafts";
import { MessageEditor } from "@/components/generators/message-editor";
import {
  generateRequestDiMessage,
  generateRequestLpMessage,
} from "@/lib/generators/permission-requests";

type PermissionRequestPreviewProps = {
  id?: string;
  draftType: "REQUEST_DI_FP" | "REQUEST_LP";
  title: string;
  templateBody: string;
  cohortName: string;
  initialRecipient?: string | null;
  initialName?: string | null;
  initialLocation?: string | null;
  initialTime?: string | null;
  initialFirstTime?: boolean;
  defaultRecipient: string;
  defaultLocation: string;
  defaultTime: string;
  defaultName?: string;
  dutyInstructorActive?: string | null;
  dutyInstructorReserve?: string | null;
};

export function PermissionRequestPreview({
  id,
  draftType,
  title,
  templateBody,
  cohortName,
  initialRecipient,
  initialName,
  initialLocation,
  initialTime,
  initialFirstTime = false,
  defaultRecipient,
  defaultLocation,
  defaultTime,
  defaultName = "",
  dutyInstructorActive,
  dutyInstructorReserve,
}: PermissionRequestPreviewProps) {
  const supportsFirstTime = draftType === "REQUEST_DI_FP" || draftType === "REQUEST_LP";
  const [recipient, setRecipient] = useState(initialRecipient ?? defaultRecipient);
  const [name, setName] = useState(initialName ?? defaultName);
  const [location, setLocation] = useState(initialLocation ?? defaultLocation);
  const [time, setTime] = useState(initialTime ?? defaultTime);
  const [firstTime, setFirstTime] = useState(initialFirstTime);
  const [pending, startTransition] = useTransition();
  const lastSavedDraftRef = useRef(
    JSON.stringify({
      recipient: initialRecipient ?? defaultRecipient,
      name: initialName ?? defaultName,
      location: initialLocation ?? defaultLocation,
      time: initialTime ?? defaultTime,
      firstTime: initialFirstTime,
    }),
  );

  useEffect(() => {
    const nextDraft = JSON.stringify({
      recipient,
      name,
      location,
      time,
      firstTime,
    });

    if (nextDraft === lastSavedDraftRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const result = await updateAnnouncementDraftAction({
          type: draftType,
          recipient,
          name,
          location,
          time,
          firstTime,
        });

        if (result.ok) {
          lastSavedDraftRef.current = nextDraft;
        }
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [draftType, firstTime, location, name, recipient, startTransition, time]);

  function generateMessage() {
    if (draftType === "REQUEST_DI_FP") {
      return generateRequestDiMessage(templateBody, {
        recipient,
        name,
        cohortName,
        location,
        time,
        firstTime,
      });
    }

    return generateRequestLpMessage(templateBody, {
      recipient,
      name,
      cohortName,
      location,
      time,
      firstTime,
    });
  }

  const initialGeneratedText = generateMessage();

  return (
    <section id={id} className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

      <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-slate-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Today&apos;s DI</p>
        <p className="mt-2 text-sm text-slate-900">
          Active: {dutyInstructorActive?.trim() ? dutyInstructorActive : "Not set"}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Reserve: {dutyInstructorReserve?.trim() ? dutyInstructorReserve : "Not set"}
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Sir / Ma&apos;am</label>
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Location</label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
        </div>

        {supportsFirstTime ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Time</label>
          <input
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
          />
          </div>
        </div>

      {supportsFirstTime ? (
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={firstTime}
            onChange={(event) => setFirstTime(event.target.checked)}
            className="size-4 rounded border-black/20"
          />
          First time request
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
