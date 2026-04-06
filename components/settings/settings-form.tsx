"use client";

import type { TemplateType } from "@prisma/client";
import { useState, useTransition } from "react";

import {
  resetMessageTemplateAction,
  updateMessageTemplateAction,
  updateUserSettingsAction,
} from "@/actions/settings";

type SettingsValues = {
  unitName: string;
  defaultParadePrefix: string | null;
  defaultNightPrefix: string | null;
  defaultMtrMorningText: string | null;
  defaultMtrAfternoonText: string | null;
  defaultLastParadeText: string | null;
};

type TemplateRow = {
  id: string;
  type: TemplateType;
  displayType: string;
  name: string;
  body: string;
  defaultBody: string;
};

export function SettingsForm({
  settings,
  templates,
}: {
  settings: SettingsValues;
  templates: TemplateRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [settingsValues, setSettingsValues] = useState({
    unitName: settings.unitName,
    defaultParadePrefix: settings.defaultParadePrefix ?? "",
    defaultNightPrefix: settings.defaultNightPrefix ?? "",
    defaultMtrMorningText: settings.defaultMtrMorningText ?? "",
    defaultMtrAfternoonText: settings.defaultMtrAfternoonText ?? "",
    defaultLastParadeText: settings.defaultLastParadeText ?? "",
  });
  const [templateBodies, setTemplateBodies] = useState(
    Object.fromEntries(templates.map((template) => [template.type, template.body])),
  );
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
            <p className="text-sm text-slate-600">
              User-level defaults are separate from operational records and generated artifacts.
            </p>
          </div>
          {status ? <span className="text-sm font-medium text-slate-500">{status}</span> : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Unit Name</label>
            <input
              value={settingsValues.unitName}
              onChange={(event) =>
                setSettingsValues((current) => ({ ...current, unitName: event.target.value }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Morning Parade Prefix</label>
            <input
              value={settingsValues.defaultParadePrefix}
              onChange={(event) =>
                setSettingsValues((current) => ({
                  ...current,
                  defaultParadePrefix: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Night Parade Prefix</label>
            <input
              value={settingsValues.defaultNightPrefix}
              onChange={(event) =>
                setSettingsValues((current) => ({
                  ...current,
                  defaultNightPrefix: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Morning MTR Text</label>
            <textarea
              rows={3}
              value={settingsValues.defaultMtrMorningText}
              onChange={(event) =>
                setSettingsValues((current) => ({
                  ...current,
                  defaultMtrMorningText: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Afternoon MTR Text</label>
            <textarea
              rows={3}
              value={settingsValues.defaultMtrAfternoonText}
              onChange={(event) =>
                setSettingsValues((current) => ({
                  ...current,
                  defaultMtrAfternoonText: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Last Parade Text</label>
            <textarea
              rows={3}
              value={settingsValues.defaultLastParadeText}
              onChange={(event) =>
                setSettingsValues((current) => ({
                  ...current,
                  defaultLastParadeText: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await updateUserSettingsAction(settingsValues);
              setStatus(result.ok ? result.message ?? "Settings saved." : result.error ?? "Unable to save.");
            });
          }}
          className="mt-5 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          Save Settings
        </button>
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Template Bodies</h2>
        <div className="mt-4 space-y-4">
          {templates.map((template) => (
            <article key={template.id} className="rounded-[1.5rem] border border-black/10 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{template.displayType}</p>
                  <p className="text-sm text-slate-600">{template.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await resetMessageTemplateAction({
                          type: template.type,
                        });

                        if (result.ok) {
                          setTemplateBodies((current) => ({
                            ...current,
                            [template.type]: template.defaultBody,
                          }));
                        }

                        setStatus(
                          result.ok
                            ? result.message ?? "Template reset to default."
                            : result.error ?? "Unable to reset template.",
                        );
                      });
                    }}
                    className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    Reset to Default
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await updateMessageTemplateAction({
                          type: template.type,
                          body: templateBodies[template.type] ?? template.body,
                        });
                        setStatus(
                          result.ok ? result.message ?? "Template saved." : result.error ?? "Unable to save.",
                        );
                      });
                    }}
                    className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    Save Template
                  </button>
                </div>
              </div>
              <textarea
                rows={12}
                value={templateBodies[template.type] ?? template.body}
                onChange={(event) =>
                  setTemplateBodies((current) => ({
                    ...current,
                    [template.type]: event.target.value,
                  }))
                }
                className="mt-4 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 py-4 font-mono text-sm leading-6 outline-none focus:border-teal-700"
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
