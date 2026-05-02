"use client";

import { Edit3, FileText, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { ActionResult } from "@/actions/helpers";
import {
  createCetTemplate,
  createCetTemplateBlock,
  deleteCetTemplate,
  deleteCetTemplateBlock,
  updateCetTemplate,
  updateCetTemplateBlock,
  type CetTemplateBlockView,
  type CetTemplateEditorData,
  type CetTemplateView,
} from "@/actions/cet-templates";
import { SearchableCombobox } from "@/components/generators/searchable-combobox";
import {
  CET_ACTIVITY_TYPE_OPTIONS,
  getCetActivityLabel,
} from "@/lib/cet";
import { cn } from "@/lib/utils";

type SerializedDate<T> = T extends Date
  ? Date | string
  : T extends Array<infer U>
    ? Array<SerializedDate<U>>
    : T extends object
      ? { [K in keyof T]: SerializedDate<T[K]> }
      : T;

type SerializedCetTemplateEditorData = SerializedDate<CetTemplateEditorData>;
type SerializedCetTemplateView = SerializedDate<CetTemplateView>;

type TemplateBlockFormState = {
  id?: string;
  templateId: string;
  startTime: string;
  endTime: string;
  title: string;
  activityType: CetTemplateBlockView["activityType"];
  venueName: string;
  attireName: string;
  requiredItems: string;
  remarks: string;
};

const DEFAULT_BLOCK_FORM: Omit<TemplateBlockFormState, "templateId"> = {
  startTime: "07:30",
  endTime: "08:30",
  title: "",
  activityType: "LAB",
  venueName: "",
  attireName: "",
  requiredItems: "",
  remarks: "",
};

function hydrateTemplate(template: SerializedCetTemplateView): CetTemplateView {
  return {
    ...template,
    createdAt: template.createdAt instanceof Date ? template.createdAt : new Date(template.createdAt),
    updatedAt: template.updatedAt instanceof Date ? template.updatedAt : new Date(template.updatedAt),
  };
}

function blockToFormState(block: CetTemplateBlockView): TemplateBlockFormState {
  return {
    id: block.id,
    templateId: block.templateId,
    startTime: block.startTime,
    endTime: block.endTime,
    title: block.title,
    activityType: block.activityType,
    venueName: block.venue?.name ?? "",
    attireName: block.attire?.name ?? "",
    requiredItems: block.requiredItems ?? "",
    remarks: block.remarks ?? "",
  };
}

function resolveOptionInput(
  value: string,
  options: Array<{ id: string; name: string }>,
): { id: string; createName: string } {
  const trimmed = value.trim();
  const match = options.find((option) => option.name.toLowerCase() === trimmed.toLowerCase());

  if (match) {
    return { id: match.id, createName: "" };
  }

  return { id: "", createName: trimmed };
}

function getActionMessage(result: ActionResult) {
  return result.ok ? result.message : result.error;
}

function formatTemplateTimeRange(block: Pick<CetTemplateBlockView, "startTime" | "endTime">) {
  return `${block.startTime.replace(":", "")} - ${block.endTime.replace(":", "")}`;
}

function sortBlocks(blocks: CetTemplateBlockView[]) {
  return [...blocks].sort((left, right) => {
    const start = left.startTime.localeCompare(right.startTime);
    if (start !== 0) return start;

    const end = left.endTime.localeCompare(right.endTime);
    if (end !== 0) return end;

    return left.title.localeCompare(right.title);
  });
}

function sortTemplates(templates: CetTemplateView[]) {
  return [...templates].sort((left, right) => left.name.localeCompare(right.name));
}

export function CetTemplateEditor({
  initialData,
  dailyHref,
  embedded = false,
  onDataChanged,
}: {
  initialData: SerializedCetTemplateEditorData;
  dailyHref?: string;
  embedded?: boolean;
  onDataChanged?: () => void;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<CetTemplateView[]>(
    () => initialData.templates.map(hydrateTemplate),
  );
  const [venues, setVenues] = useState(initialData.venues);
  const [attireOptions, setAttireOptions] = useState(initialData.attireOptions);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    () => initialData.templates[0]?.id ?? "",
  );
  const [templateModalMode, setTemplateModalMode] = useState<"closed" | "create" | "rename">("closed");
  const [templateName, setTemplateName] = useState("");
  const [blockModalMode, setBlockModalMode] = useState<"closed" | "create" | "edit">("closed");
  const [blockForm, setBlockForm] = useState<TemplateBlockFormState>({
    ...DEFAULT_BLOCK_FORM,
    templateId: selectedTemplateId,
  });
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [templates, selectedTemplateId],
  );
  const selectedBlocks = useMemo(
    () => sortBlocks(selectedTemplate?.blocks ?? []),
    [selectedTemplate],
  );

  const notifyChanged = () => {
    if (onDataChanged) {
      onDataChanged();
    } else {
      router.refresh();
    }
  };

  const upsertTemplateInState = (template: CetTemplateView) => {
    setTemplates((current) => {
      const withoutTemplate = current.filter((item) => item.id !== template.id);
      return sortTemplates([...withoutTemplate, template]);
    });
    setSelectedTemplateId(template.id);
  };

  const upsertBlockInState = (block: CetTemplateBlockView) => {
    if (block.venue) {
      const venue = block.venue;
      setVenues((current) =>
        current.some((item) => item.id === venue.id)
          ? current
          : [...current, venue].sort((left, right) => left.name.localeCompare(right.name)),
      );
    }

    if (block.attire) {
      const attire = block.attire;
      setAttireOptions((current) =>
        current.some((item) => item.id === attire.id)
          ? current
          : [...current, attire].sort((left, right) => left.name.localeCompare(right.name)),
      );
    }

    setTemplates((current) =>
      current.map((template) =>
        template.id === block.templateId
          ? {
              ...template,
              blocks: sortBlocks([
                ...template.blocks.filter((item) => item.id !== block.id),
                block,
              ]),
            }
          : template,
      ),
    );
  };

  const openCreateTemplate = () => {
    setTemplateName("");
    setStatus(null);
    setTemplateModalMode("create");
  };

  const openRenameTemplate = () => {
    if (!selectedTemplate) return;
    setTemplateName(selectedTemplate.name);
    setStatus(null);
    setTemplateModalMode("rename");
  };

  const openCreateBlock = () => {
    if (!selectedTemplate) return;
    setBlockForm({ ...DEFAULT_BLOCK_FORM, templateId: selectedTemplate.id });
    setStatus(null);
    setBlockModalMode("create");
  };

  const openEditBlock = (block: CetTemplateBlockView) => {
    setBlockForm(blockToFormState(block));
    setStatus(null);
    setBlockModalMode("edit");
  };

  const submitTemplateForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const input = {
      id: templateModalMode === "rename" ? selectedTemplate?.id : undefined,
      name: templateName,
    };
    const result =
      templateModalMode === "rename"
        ? await updateCetTemplate(input)
        : await createCetTemplate(input);

    setPending(false);

    if (!result.ok || !result.template) {
      setStatus({
        kind: "error",
        message: getActionMessage(result) ?? "Unable to save template.",
      });
      return;
    }

    upsertTemplateInState(result.template);
    setTemplateModalMode("closed");
    setStatus({ kind: "ok", message: getActionMessage(result) ?? "Template saved." });
    notifyChanged();
  };

  const removeTemplate = async () => {
    if (!selectedTemplate || !window.confirm(`Delete "${selectedTemplate.name}"?`)) {
      return;
    }

    setPending(true);
    setStatus(null);
    const result = await deleteCetTemplate({ templateId: selectedTemplate.id });
    setPending(false);

    if (!result.ok) {
      setStatus({
        kind: "error",
        message: getActionMessage(result) ?? "Unable to delete template.",
      });
      return;
    }

    setTemplates((current) => current.filter((template) => template.id !== selectedTemplate.id));
    setSelectedTemplateId((current) => {
      const remaining = templates.filter((template) => template.id !== selectedTemplate.id);
      return current === selectedTemplate.id ? remaining[0]?.id ?? "" : current;
    });
    setStatus({ kind: "ok", message: getActionMessage(result) ?? "Template deleted." });
    notifyChanged();
  };

  const submitBlockForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const venueInput = resolveOptionInput(blockForm.venueName, venues);
    const attireInput = resolveOptionInput(blockForm.attireName, attireOptions);
    const input = {
      id: blockModalMode === "edit" ? blockForm.id : undefined,
      templateId: blockForm.templateId,
      startTime: blockForm.startTime,
      endTime: blockForm.endTime,
      title: blockForm.title,
      activityType: blockForm.activityType,
      venueId: venueInput.id,
      createVenueName: venueInput.createName,
      attireId: attireInput.id,
      createAttireName: attireInput.createName,
      requiredItems: blockForm.requiredItems,
      remarks: blockForm.remarks,
      visibility: "COHORT" as const,
    };
    const result =
      blockModalMode === "edit"
        ? await updateCetTemplateBlock(input)
        : await createCetTemplateBlock(input);

    setPending(false);

    if (!result.ok || !result.block) {
      setStatus({
        kind: "error",
        message: getActionMessage(result) ?? "Unable to save template block.",
      });
      return;
    }

    upsertBlockInState(result.block);
    setBlockModalMode("closed");
    setStatus({ kind: "ok", message: getActionMessage(result) ?? "Template block saved." });
    notifyChanged();
  };

  const removeBlock = async () => {
    if (!blockForm.id || !window.confirm("Delete this template block?")) {
      return;
    }

    setPending(true);
    setStatus(null);
    const result = await deleteCetTemplateBlock({ blockId: blockForm.id });
    setPending(false);

    if (!result.ok) {
      setStatus({
        kind: "error",
        message: getActionMessage(result) ?? "Unable to delete template block.",
      });
      return;
    }

    setTemplates((current) =>
      current.map((template) =>
        template.id === blockForm.templateId
          ? {
              ...template,
              blocks: template.blocks.filter((block) => block.id !== blockForm.id),
            }
          : template,
      ),
    );
    setBlockModalMode("closed");
    setStatus({ kind: "ok", message: getActionMessage(result) ?? "Template block deleted." });
    notifyChanged();
  };

  return (
    <div className={cn("flex flex-1 flex-col gap-5", embedded ? "" : "w-full")}>
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              CET Templates
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Template Editor
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Manage reusable cohort-wide CET templates separately from daily edits.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {dailyHref ? (
              <Link
                href={dailyHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Daily Editor
              </Link>
            ) : null}
            <button
              type="button"
              onClick={openCreateTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Template
            </button>
          </div>
        </div>
      </section>

      {status ? (
        <p
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-medium",
            status.kind === "ok"
              ? "border-teal-200 bg-teal-50 text-teal-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          {status.message}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Templates
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                {templates.length} saved
              </h2>
            </div>
          </div>

          {templates.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
              No templates yet.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => {
                const selected = selectedTemplate?.id === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition",
                      selected
                        ? "bg-teal-700 text-white shadow-sm"
                        : "border border-black/10 bg-white text-slate-800 hover:bg-slate-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{template.name}</span>
                      <span
                        className={cn(
                          "mt-1 block text-xs font-medium",
                          selected ? "text-teal-50" : "text-slate-500",
                        )}
                      >
                        {template.blocks.length} block{template.blocks.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-sm sm:p-6">
          {selectedTemplate ? (
            <>
              <div className="mb-5 flex flex-col gap-3 border-b border-black/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Template Blocks
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    {selectedTemplate.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Cohort-wide by default. Selected-cadet targeting is not used in templates.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={openRenameTemplate}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={removeTemplate}
                    disabled={pending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={openCreateBlock}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Block
                  </button>
                </div>
              </div>

              {selectedBlocks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-black/10 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                  No blocks in this template.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedBlocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => openEditBlock(block)}
                      className="grid w-full gap-3 rounded-2xl border border-black/10 bg-white p-4 text-left transition hover:bg-slate-50 md:grid-cols-[8rem_minmax(0,1fr)_8rem]"
                    >
                      <span className="text-sm font-semibold text-teal-800">
                        {formatTemplateTimeRange(block)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {block.title}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-slate-500">
                          {[block.venue?.name, block.attire?.name].filter(Boolean).join(" · ") ||
                            "No venue or attire"}
                        </span>
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {getCetActivityLabel(block.activityType)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="rounded-2xl border border-dashed border-black/10 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
              Create a template to add blocks.
            </p>
          )}
        </section>
      </div>

      {templateModalMode !== "closed" ? (
        <TemplateNameModal
          mode={templateModalMode}
          value={templateName}
          pending={pending}
          status={status}
          onValueChange={setTemplateName}
          onClose={() => !pending && setTemplateModalMode("closed")}
          onSubmit={submitTemplateForm}
        />
      ) : null}

      {blockModalMode !== "closed" ? (
        <TemplateBlockModal
          mode={blockModalMode}
          formState={blockForm}
          setFormState={setBlockForm}
          venues={venues}
          attireOptions={attireOptions}
          pending={pending}
          status={status}
          onClose={() => !pending && setBlockModalMode("closed")}
          onSubmit={submitBlockForm}
          onDelete={removeBlock}
        />
      ) : null}
    </div>
  );
}

function TemplateNameModal({
  mode,
  value,
  pending,
  status,
  onValueChange,
  onClose,
  onSubmit,
}: {
  mode: "create" | "rename";
  value: string;
  pending: boolean;
  status: { kind: "ok" | "error"; message: string } | null;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-[2rem] border border-black/10 bg-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]">
        <ModalHeader
          eyebrow="CET Template"
          title={mode === "create" ? "Create Template" : "Rename Template"}
          pending={pending}
          onClose={onClose}
        />
        <form onSubmit={onSubmit} className="space-y-5 p-5">
          <Field label="Template name">
            <input
              type="text"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              required
              maxLength={120}
              autoFocus
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </Field>
          <ModalStatus status={status} />
          <ModalActions
            pending={pending}
            submitLabel={mode === "create" ? "Create Template" : "Save Name"}
            pendingLabel="Saving..."
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
}

function TemplateBlockModal({
  mode,
  formState,
  setFormState,
  venues,
  attireOptions,
  pending,
  status,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit";
  formState: TemplateBlockFormState;
  setFormState: React.Dispatch<React.SetStateAction<TemplateBlockFormState>>;
  venues: Array<{ id: string; name: string }>;
  attireOptions: Array<{ id: string; name: string }>;
  pending: boolean;
  status: { kind: "ok" | "error"; message: string } | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[96vh] w-full overflow-y-auto rounded-t-[2rem] border border-black/10 bg-white shadow-2xl sm:max-w-3xl sm:rounded-[2rem]">
        <ModalHeader
          eyebrow="Cohort-wide Template Block"
          title={mode === "create" ? "Add Template Block" : "Edit Template Block"}
          pending={pending}
          onClose={onClose}
        />
        <form onSubmit={onSubmit} className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start time">
              <input
                type="time"
                value={formState.startTime}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, startTime: event.target.value }))
                }
                required
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </Field>
            <Field label="End time">
              <input
                type="time"
                value={formState.endTime}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, endTime: event.target.value }))
                }
                required
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
              />
            </Field>
          </div>

          <Field label="Title">
            <input
              type="text"
              value={formState.title}
              onChange={(event) =>
                setFormState((current) => ({ ...current, title: event.target.value }))
              }
              required
              maxLength={160}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </Field>

          <Field label="Activity type">
            <select
              value={formState.activityType}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  activityType: event.target.value as TemplateBlockFormState["activityType"],
                }))
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            >
              {CET_ACTIVITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableCombobox
              label="Venue"
              value={formState.venueName}
              onValueChange={(value) =>
                setFormState((current) => ({ ...current, venueName: value }))
              }
              suggestions={venues.map((venue) => venue.name)}
              placeholder="Select or create venue"
              autoCapitalize="words"
            />
            <SearchableCombobox
              label="Attire"
              value={formState.attireName}
              onValueChange={(value) =>
                setFormState((current) => ({ ...current, attireName: value }))
              }
              suggestions={attireOptions.map((attire) => attire.name)}
              placeholder="Select or create attire"
              autoCapitalize="words"
            />
          </div>

          <Field label="Required items">
            <textarea
              value={formState.requiredItems}
              onChange={(event) =>
                setFormState((current) => ({ ...current, requiredItems: event.target.value }))
              }
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </Field>

          <Field label="Remarks">
            <textarea
              value={formState.remarks}
              onChange={(event) =>
                setFormState((current) => ({ ...current, remarks: event.target.value }))
              }
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700"
            />
          </Field>

          <ModalStatus status={status} />

          <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {mode === "edit" ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                {pending ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Block"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalHeader({
  eyebrow,
  title,
  pending,
  onClose,
}: {
  eyebrow: string;
  title: string;
  pending: boolean;
  onClose: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          {eyebrow}
        </p>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        aria-label="Close"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ModalActions({
  pending,
  submitLabel,
  pendingLabel,
  onClose,
}: {
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}

function ModalStatus({
  status,
}: {
  status: { kind: "ok" | "error"; message: string } | null;
}) {
  if (!status) return null;

  return (
    <p
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-medium",
        status.kind === "ok"
          ? "border-teal-200 bg-teal-50 text-teal-800"
          : "border-rose-200 bg-rose-50 text-rose-800",
      )}
    >
      {status.message}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
