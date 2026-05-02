"use client";

import {
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  History,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createCetDayBlockAction,
  deleteCetDayBlockAction,
  updateCetDayBlockAction,
  type CetDayBlockView,
  type CetDayEditorData,
} from "@/actions/cet-day";
import { applyTemplateToDate, saveDayAsTemplate } from "@/actions/cet-templates";
import { SearchableCombobox } from "@/components/generators/searchable-combobox";
import { CetTimeline } from "@/components/cet/cet-timeline";
import {
  CET_ACTIVITY_TYPE_OPTIONS,
  formatCetTimeRange,
  getSingaporeTimeOfDay,
} from "@/lib/cet";
import type { CetTimelineBlock } from "@/lib/cet-read";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/actions/helpers";

type SerializedDate<T> = T extends Date
  ? Date | string
  : T extends Array<infer U>
    ? Array<SerializedDate<U>>
    : T extends object
      ? { [K in keyof T]: SerializedDate<T[K]> }
      : T;

type SerializedCetDayEditorData = SerializedDate<CetDayEditorData>;
type SerializedCetDayHistoryEntry = SerializedCetDayEditorData["history"][number];
type SerializedCetTimelineBlock = SerializedDate<CetTimelineBlock>;
type TemplateApplyMode = "REPLACE" | "APPEND";

type CetBlockFormState = {
  id?: string;
  startTime: string;
  endTime: string;
  title: string;
  activityType: CetTimelineBlock["activityType"];
  venueName: string;
  attireName: string;
  requiredItems: string;
  remarks: string;
  visibility: CetTimelineBlock["visibility"];
  targetCadetIds: string[];
};

const DEFAULT_FORM_STATE: CetBlockFormState = {
  startTime: "07:30",
  endTime: "08:30",
  title: "",
  activityType: "LAB",
  venueName: "",
  attireName: "",
  requiredItems: "",
  remarks: "",
  visibility: "COHORT",
  targetCadetIds: [],
};

function hydrateBlock(block: SerializedCetTimelineBlock): CetTimelineBlock {
  return {
    ...block,
    startAt: block.startAt instanceof Date ? block.startAt : new Date(block.startAt),
    endAt: block.endAt instanceof Date ? block.endAt : new Date(block.endAt),
  };
}

function hydrateEditorBlock(block: SerializedDate<CetDayBlockView>): CetDayBlockView {
  return {
    ...block,
    startAt: block.startAt instanceof Date ? block.startAt : new Date(block.startAt),
    endAt: block.endAt instanceof Date ? block.endAt : new Date(block.endAt),
  };
}

function hydrateHistoryEntry(
  entry: SerializedCetDayHistoryEntry,
): CetDayEditorData["history"][number] {
  return {
    ...entry,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt),
  };
}

function blockToFormState(block: CetDayBlockView): CetBlockFormState {
  return {
    id: block.id,
    startTime: getSingaporeTimeOfDay(block.startAt),
    endTime: getSingaporeTimeOfDay(block.endAt),
    title: block.title,
    activityType: block.activityType,
    venueName: block.venue?.name ?? "",
    attireName: block.attire?.name ?? "",
    requiredItems: block.requiredItems ?? "",
    remarks: block.remarks ?? "",
    visibility: block.visibility,
    targetCadetIds: block.targetCadets.map((cadet) => cadet.id),
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

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function CetEditor({
  selectedDate,
  previousWeekDate,
  nextWeekDate,
  editorData,
  timeline,
  onDateChange,
  onDataChanged,
  templateHref,
}: {
  selectedDate: string;
  previousWeekDate: string;
  nextWeekDate: string;
  editorData: SerializedCetDayEditorData;
  timeline: SerializedCetTimelineBlock[];
  onDateChange?: (date: string) => void;
  onDataChanged?: () => void;
  templateHref?: string;
}) {
  const router = useRouter();
  const hydratedTimeline = useMemo(() => timeline.map(hydrateBlock), [timeline]);
  const editableBlocks = useMemo(
    () => editorData.blocks.map(hydrateEditorBlock),
    [editorData.blocks],
  );
  const historyEntries = useMemo(
    () => editorData.history.map(hydrateHistoryEntry),
    [editorData.history],
  );
  const editableBlockById = useMemo(
    () => new Map(editableBlocks.map((block) => [block.id, block])),
    [editableBlocks],
  );
  const cohortBlockCount = editableBlocks.filter((block) => block.visibility === "COHORT").length;
  const selectedBlockCount = editableBlocks.length - cohortBlockCount;
  const templateEligibleBlockCount = editableBlocks.filter(
    (block) => block.source === "MANUAL" || block.source === "TEMPLATE",
  ).length;
  const [formState, setFormState] = useState<CetBlockFormState>(DEFAULT_FORM_STATE);
  const [viewBlock, setViewBlock] = useState<CetTimelineBlock | null>(null);
  const [mode, setMode] = useState<"closed" | "create" | "edit" | "view">("closed");
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedTemplateName, setSavedTemplateName] = useState<string | null>(null);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState("");
  const [applyTargetDate, setApplyTargetDate] = useState(selectedDate);
  const [applyMode, setApplyMode] = useState<TemplateApplyMode>("REPLACE");
  const [appliedTemplateName, setAppliedTemplateName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const openCreate = () => {
    setFormState(DEFAULT_FORM_STATE);
    setViewBlock(null);
    setStatus(null);
    setMode("create");
  };

  const openSaveTemplate = () => {
    setTemplateName(`CET ${selectedDate}`);
    setSavedTemplateName(null);
    setStatus(null);
    setSaveTemplateOpen(true);
  };

  const openApplyTemplate = () => {
    setApplyTemplateId(editorData.templates[0]?.id ?? "");
    setApplyTargetDate(selectedDate);
    setApplyMode("REPLACE");
    setAppliedTemplateName(null);
    setStatus(null);
    setApplyTemplateOpen(true);
  };

  const openBlock = (block: CetTimelineBlock) => {
    const editableBlock = editableBlockById.get(block.id);
    setStatus(null);
    setViewBlock(block);

    if (!editableBlock || block.readonly || block.source === "APPOINTMENT_IMPORT") {
      setMode("view");
      return;
    }

    setFormState(blockToFormState(editableBlock));
    setMode("edit");
  };

  const closeModal = () => {
    if (pending) return;
    setMode("closed");
    setViewBlock(null);
    setStatus(null);
  };

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const venueInput = resolveOptionInput(formState.venueName, editorData.venues);
    const attireInput = resolveOptionInput(formState.attireName, editorData.attireOptions);
    const input = {
      id: mode === "edit" ? formState.id : undefined,
      date: selectedDate,
      startTime: formState.startTime,
      endTime: formState.endTime,
      title: formState.title,
      activityType: formState.activityType,
      venueId: venueInput.id,
      createVenueName: venueInput.createName,
      attireId: attireInput.id,
      createAttireName: attireInput.createName,
      requiredItems: formState.requiredItems,
      remarks: formState.remarks,
      visibility: formState.visibility,
      targetCadetIds:
        formState.visibility === "SELECTED_CADETS" ? formState.targetCadetIds : [],
    };
    const result =
      mode === "edit"
        ? await updateCetDayBlockAction(input)
        : await createCetDayBlockAction(input);

    setPending(false);

    if (!result.ok) {
      setStatus({ kind: "error", message: getActionMessage(result) ?? "Unable to save block." });
      return;
    }

    setStatus({ kind: "ok", message: getActionMessage(result) ?? "Saved." });
    setMode("closed");
    if (onDataChanged) {
      onDataChanged();
    } else {
      router.refresh();
    }
  };

  const submitSaveTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    setSavedTemplateName(null);

    const result = await saveDayAsTemplate({
      date: selectedDate,
      templateName,
    });

    setPending(false);

    if (!result.ok) {
      setStatus({
        kind: "error",
        message: getActionMessage(result) ?? "Unable to save template.",
      });
      return;
    }

    const createdName = result.template?.name ?? templateName.trim();
    setSavedTemplateName(createdName);
    setStatus({
      kind: "ok",
      message: getActionMessage(result) ?? "Template saved from day.",
    });

    if (onDataChanged) {
      onDataChanged();
    } else {
      router.refresh();
    }
  };

  const submitApplyTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    setAppliedTemplateName(null);

    const selectedTemplate = editorData.templates.find((template) => template.id === applyTemplateId);
    const result = await applyTemplateToDate({
      templateId: applyTemplateId,
      date: applyTargetDate,
      mode: applyMode,
    });

    setPending(false);

    if (!result.ok) {
      setStatus({
        kind: "error",
        message: getActionMessage(result) ?? "Unable to apply template.",
      });
      return;
    }

    setAppliedTemplateName(selectedTemplate?.name ?? "Template");
    setStatus({
      kind: "ok",
      message: getActionMessage(result) ?? "Template applied to date.",
    });

    if (onDateChange && applyTargetDate !== selectedDate) {
      onDateChange(applyTargetDate);
    } else if (applyTargetDate !== selectedDate) {
      router.push(`/cwc/cet?date=${applyTargetDate}`);
    } else if (onDataChanged) {
      onDataChanged();
    } else {
      router.refresh();
    }
  };

  const deleteBlock = async () => {
    if (!formState.id || !window.confirm("Delete this CET block?")) {
      return;
    }

    setPending(true);
    setStatus(null);
    const result = await deleteCetDayBlockAction({ blockId: formState.id });
    setPending(false);

    if (!result.ok) {
      setStatus({ kind: "error", message: getActionMessage(result) ?? "Unable to delete block." });
      return;
    }

    setMode("closed");
    if (onDataChanged) {
      onDataChanged();
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              CET Editor
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Cohort Timeline
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review and prepare CET blocks for the selected date.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Block
            </button>
            <button
              type="button"
              onClick={openSaveTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save today as template
            </button>
            <button
              type="button"
              onClick={openApplyTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Apply template
            </button>
            {templateHref ? (
              <Link
                href={templateHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Templates
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Selected Date
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {formatDateHeading(selectedDate)}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {cohortBlockCount} cohort block{cohortBlockCount === 1 ? "" : "s"}
              {selectedBlockCount > 0
                ? `, ${selectedBlockCount} selected block${selectedBlockCount === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <DateNavigationButton
              date={previousWeekDate}
              onDateChange={onDateChange}
              direction="previous"
            />
            <form
              action="/cwc/cet"
              onSubmit={
                onDateChange
                  ? (event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      const date = formData.get("date");

                      if (typeof date === "string" && date) {
                        onDateChange(date);
                      }
                    }
                  : undefined
              }
              className="flex min-w-0 items-center gap-2"
            >
              <label htmlFor="date" className="sr-only">
                CET date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={selectedDate}
                className="min-h-11 min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm sm:w-44"
              />
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Go
              </button>
            </form>
            <DateNavigationButton
              date={nextWeekDate}
              onDateChange={onDateChange}
              direction="next"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              Timeline
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
              {editorData.schedule?.title || "CET Blocks"}
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-500">
            {hydratedTimeline.length} visible item{hydratedTimeline.length === 1 ? "" : "s"}
          </p>
        </div>

        <CetTimeline
          blocks={hydratedTimeline}
          date={selectedDate}
          emptyLabel="No CET scheduled"
          onBlockClick={openBlock}
          showAudience
          appointmentsHref="/cwc/appointments"
        />
      </section>

      <VersionHistoryPanel
        history={historyEntries}
        expandedHistoryId={expandedHistoryId}
        onToggle={(entryId) =>
          setExpandedHistoryId((current) => (current === entryId ? null : entryId))
        }
      />

      {mode !== "closed" ? (
        <CetBlockModal
          mode={mode}
          block={viewBlock}
          formState={formState}
          setFormState={setFormState}
          venues={editorData.venues}
          attireOptions={editorData.attireOptions}
          cadets={editorData.cadets}
          pending={pending}
          status={status}
          onClose={closeModal}
          onSubmit={submitForm}
          onDelete={deleteBlock}
        />
      ) : null}

      {saveTemplateOpen ? (
        <SaveDayAsTemplateModal
          selectedDate={selectedDate}
          templateHref={templateHref}
          templateName={templateName}
          eligibleBlockCount={templateEligibleBlockCount}
          savedTemplateName={savedTemplateName}
          pending={pending}
          status={status}
          onTemplateNameChange={setTemplateName}
          onClose={() => {
            if (pending) return;
            setSaveTemplateOpen(false);
            setSavedTemplateName(null);
            setStatus(null);
          }}
          onSubmit={submitSaveTemplate}
        />
      ) : null}

      {applyTemplateOpen ? (
        <ApplyTemplateModal
          templates={editorData.templates}
          selectedDate={selectedDate}
          targetDate={applyTargetDate}
          templateId={applyTemplateId}
          mode={applyMode}
          appliedTemplateName={appliedTemplateName}
          pending={pending}
          status={status}
          onTargetDateChange={setApplyTargetDate}
          onTemplateChange={setApplyTemplateId}
          onModeChange={setApplyMode}
          onClose={() => {
            if (pending) return;
            setApplyTemplateOpen(false);
            setAppliedTemplateName(null);
            setStatus(null);
          }}
          onSubmit={submitApplyTemplate}
        />
      ) : null}
    </div>
  );
}

function SaveDayAsTemplateModal({
  selectedDate,
  templateHref,
  templateName,
  eligibleBlockCount,
  savedTemplateName,
  pending,
  status,
  onTemplateNameChange,
  onClose,
  onSubmit,
}: {
  selectedDate: string;
  templateHref?: string;
  templateName: string;
  eligibleBlockCount: number;
  savedTemplateName: string | null;
  pending: boolean;
  status: { kind: "ok" | "error"; message: string } | null;
  onTemplateNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-[2rem] border border-black/10 bg-white shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              CET Template
            </p>
            <h2 className="text-xl font-semibold text-slate-900">Save Today as Template</h2>
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

        <form onSubmit={onSubmit} className="space-y-5 p-5">
          <Field label="Template name">
            <input
              type="text"
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              required
              maxLength={120}
              disabled={Boolean(savedTemplateName)}
              autoFocus
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </Field>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            This creates a reusable template from the daily CET blocks on {formatDateHeading(selectedDate)}.
            Imported MA/OA appointment blocks and APPOINTMENT_IMPORT source blocks are excluded.
            {eligibleBlockCount === 0
              ? " No eligible daily CET blocks will be copied."
              : ` ${eligibleBlockCount} eligible block${eligibleBlockCount === 1 ? "" : "s"} will be copied with full details.`}
          </div>

          {status ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-medium",
                status.kind === "ok"
                  ? "border-teal-200 bg-teal-50 text-teal-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              <p>{status.message}</p>
              {status.kind === "ok" && savedTemplateName ? (
                <p className="mt-1">Saved template: {savedTemplateName}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {savedTemplateName ? "Close" : "Cancel"}
            </button>

            <div className="flex flex-col gap-2 sm:flex-row">
              {savedTemplateName && templateHref ? (
                <Link
                  href={templateHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Open templates
                </Link>
              ) : null}
              {!savedTemplateName ? (
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                >
                  {pending ? "Saving..." : "Save Template"}
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplyTemplateModal({
  templates,
  selectedDate,
  targetDate,
  templateId,
  mode,
  appliedTemplateName,
  pending,
  status,
  onTargetDateChange,
  onTemplateChange,
  onModeChange,
  onClose,
  onSubmit,
}: {
  templates: SerializedCetDayEditorData["templates"];
  selectedDate: string;
  targetDate: string;
  templateId: string;
  mode: TemplateApplyMode;
  appliedTemplateName: string | null;
  pending: boolean;
  status: { kind: "ok" | "error"; message: string } | null;
  onTargetDateChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onModeChange: (value: TemplateApplyMode) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="w-full rounded-t-[2rem] border border-black/10 bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              CET Template
            </p>
            <h2 className="text-xl font-semibold text-slate-900">Apply Template</h2>
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

        <form onSubmit={onSubmit} className="space-y-5 p-5">
          <Field label="Template">
            <select
              value={templateId}
              onChange={(event) => onTemplateChange(event.target.value)}
              required
              disabled={Boolean(appliedTemplateName)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700 disabled:bg-slate-50 disabled:text-slate-500"
            >
              {templates.length === 0 ? (
                <option value="">No templates available</option>
              ) : (
                templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.blockCount} block{template.blockCount === 1 ? "" : "s"})
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="Target date">
            <input
              type="date"
              value={targetDate}
              onChange={(event) => onTargetDateChange(event.target.value)}
              required
              disabled={Boolean(appliedTemplateName)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-teal-700 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </Field>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Mode</p>
            <div className="grid gap-2 rounded-2xl bg-slate-100 p-1 text-sm font-semibold sm:grid-cols-2">
              {[
                { value: "REPLACE" as const, label: "Replace existing CET" },
                { value: "APPEND" as const, label: "Append to existing CET" },
              ].map((option) => {
                const active = mode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={Boolean(appliedTemplateName)}
                    onClick={() => onModeChange(option.value)}
                    className={cn(
                      "rounded-xl px-3 py-2 transition disabled:cursor-not-allowed disabled:opacity-70",
                      active
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Replace soft-deletes existing manual/template CET blocks for the target date.
            Append keeps existing blocks and adds the selected template. Imported MA/OA blocks are not affected.
            {targetDate !== selectedDate && isIsoDate(targetDate)
              ? ` The editor will move to ${formatDateHeading(targetDate)} after applying.`
              : ""}
          </div>

          {status ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-medium",
                status.kind === "ok"
                  ? "border-teal-200 bg-teal-50 text-teal-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              <p>{status.message}</p>
              {status.kind === "ok" && appliedTemplateName ? (
                <p className="mt-1">Applied template: {appliedTemplateName}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {appliedTemplateName ? "Close" : "Cancel"}
            </button>
            {!appliedTemplateName ? (
              <button
                type="submit"
                disabled={pending || templates.length === 0}
                className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                {pending ? "Applying..." : "Apply Template"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

function DateNavigationButton({
  date,
  direction,
  onDateChange,
}: {
  date: string;
  direction: "previous" | "next";
  onDateChange?: (date: string) => void;
}) {
  const label = direction === "previous" ? "Previous Week" : "Next Week";
  const content = (
    <>
      {direction === "previous" ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : null}
      {label}
      {direction === "next" ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : null}
    </>
  );
  const className =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

  if (onDateChange) {
    return (
      <button type="button" onClick={() => onDateChange(date)} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={`/cwc/cet?date=${date}`} className={className}>
      {content}
    </Link>
  );
}

function formatDateHeading(date: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

function formatHistoryTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function VersionHistoryPanel({
  history,
  expandedHistoryId,
  onToggle,
}: {
  history: CetDayEditorData["history"];
  expandedHistoryId: string | null;
  onToggle: (entryId: string) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Version History
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            Daily CET Changes
          </h2>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {history.length} entr{history.length === 1 ? "y" : "ies"} retained for 30 days
        </p>
      </div>

      {history.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600">
          No version history for this date.
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          {history.map((entry) => {
            const expanded = expandedHistoryId === entry.id;

            return (
              <li
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <button
                  type="button"
                  onClick={() => onToggle(entry.id)}
                  className="flex w-full flex-col gap-3 p-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                        {entry.action}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {entry.actorRole}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                      {entry.summary}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.actorName} · {formatHistoryTimestamp(entry.createdAt)}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-black/10 text-slate-600">
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                </button>

                {expanded ? (
                  <div className="grid gap-3 border-t border-black/10 bg-slate-50/60 p-4 lg:grid-cols-2">
                    <JsonSnapshot label="Before" value={entry.beforeJson} />
                    <JsonSnapshot label="After" value={entry.afterJson} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function JsonSnapshot({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      {value === null ? (
        <p className="mt-3 text-sm font-medium text-slate-500">No snapshot.</p>
      ) : (
        <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-50">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}

function CetBlockModal({
  mode,
  block,
  formState,
  setFormState,
  venues,
  attireOptions,
  cadets,
  pending,
  status,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit" | "view";
  block: CetTimelineBlock | null;
  formState: CetBlockFormState;
  setFormState: React.Dispatch<React.SetStateAction<CetBlockFormState>>;
  venues: Array<{ id: string; name: string }>;
  attireOptions: Array<{ id: string; name: string }>;
  cadets: Array<{ id: string; displayName: string }>;
  pending: boolean;
  status: { kind: "ok" | "error"; message: string } | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
}) {
  const title =
    mode === "create" ? "Add CET Block" : mode === "edit" ? "Edit CET Block" : "CET Details";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[96vh] w-full overflow-y-auto rounded-t-[2rem] border border-black/10 bg-white shadow-2xl sm:max-w-3xl sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
              {mode === "view" ? "Read Only" : "CET Block"}
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

        {mode === "view" && block ? (
          <ReadonlyBlockDetails block={block} onClose={onClose} />
        ) : (
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
                    activityType: event.target.value as CetBlockFormState["activityType"],
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

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Visibility</p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
                {[
                  { value: "COHORT", label: "Everyone" },
                  { value: "SELECTED_CADETS", label: "Selected cadets" },
                ].map((option) => {
                  const active = formState.visibility === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormState((current) => ({
                          ...current,
                          visibility: option.value as CetBlockFormState["visibility"],
                        }))
                      }
                      className={cn(
                        "rounded-xl px-3 py-2 transition",
                        active
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-600 hover:text-slate-950",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {formState.visibility === "SELECTED_CADETS" ? (
              <CadetMultiSelect
                cadets={cadets}
                selectedIds={formState.targetCadetIds}
                onChange={(targetCadetIds) =>
                  setFormState((current) => ({ ...current, targetCadetIds }))
                }
              />
            ) : null}

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
        )}
      </div>
    </div>
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

function CadetMultiSelect({
  cadets,
  selectedIds,
  onChange,
}: {
  cadets: Array<{ id: string; displayName: string }>;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}) {
  const selected = new Set(selectedIds);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Selected cadets</p>
      <div className="max-h-64 overflow-y-auto rounded-2xl border border-black/10 bg-slate-50/60 p-2">
        {cadets.map((cadet) => {
          const checked = selected.has(cadet.id);

          return (
            <label
              key={cadet.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-800 transition hover:bg-white"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selectedIds, cadet.id]);
                    return;
                  }

                  onChange(selectedIds.filter((id) => id !== cadet.id));
                }}
                className="h-4 w-4 accent-teal-700"
              />
              <span>{cadet.displayName}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs font-medium text-slate-500">
        {selectedIds.length} selected
      </p>
    </div>
  );
}

function ReadonlyBlockDetails({
  block,
  onClose,
}: {
  block: CetTimelineBlock;
  onClose: () => void;
}) {
  const isAppointmentImport = block.source === "APPOINTMENT_IMPORT";
  const timeLabel = `${block.estimatedDuration ? "Est. " : ""}${formatCetTimeRange(
    block.startAt,
    block.endAt,
  )}${block.estimatedDuration ? " (~30 min default)" : ""}`;
  const details = [
    ["Time", timeLabel],
    ["Activity", block.activityType],
    ["Venue", block.venue?.name ?? ""],
    ["Attire", block.attire?.name ?? ""],
    ["Required items", block.requiredItems ?? ""],
    ["Remarks", block.remarks ?? ""],
    ["For", block.targetCadets.map((cadet) => cadet.name).join(", ")],
  ].filter(([, value]) => value);

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{block.title}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {isAppointmentImport ? "Imported from Appointments" : "CET block"}
        </p>
      </div>

      {isAppointmentImport ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          This block is auto-imported from an MA/OA appointment. It cannot be edited or deleted
          here.{" "}
          <Link
            href="/cwc/appointments"
            className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            Edit in Appointments
          </Link>
          .
        </div>
      ) : null}

      <dl className="grid gap-3">
        {details.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-black/10 bg-slate-50/70 p-4"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex justify-end border-t border-black/10 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
