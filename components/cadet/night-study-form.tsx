"use client";

import { useState, useTransition } from "react";

import { setMyNightStudyChoiceForToday } from "@/actions/cadet-night-study";
import { cn } from "@/lib/utils";
import type { CadetNightStudyChoiceValue } from "@/lib/validators/night-study";

const OPTIONS: Array<{
  value: CadetNightStudyChoiceValue;
  label: string;
  description: string;
}> = [
  {
    value: "NIGHT_STUDY",
    label: "Night study",
    description: "I'll be at night study tonight.",
  },
  {
    value: "EARLY_PARTY",
    label: "Early party",
    description: "I'll be in the early party group.",
  },
  {
    value: "GO_BACK_BUNK",
    label: "Go back bunk",
    description: "I'll head back to bunk.",
  },
];

export function CadetNightStudyForm({
  initialChoice,
  savedChoice: initialSavedChoice,
  defaultedFromPrevious = false,
}: {
  initialChoice: CadetNightStudyChoiceValue | null;
  savedChoice?: CadetNightStudyChoiceValue | null;
  defaultedFromPrevious?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<CadetNightStudyChoiceValue | null>(initialChoice);
  const [savedChoice, setSavedChoice] = useState<CadetNightStudyChoiceValue | null>(
    initialSavedChoice ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const isDirty = selected !== savedChoice;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSavedMessage(null);

    if (!selected) {
      setError("Pick one option before saving.");
      return;
    }

    startTransition(async () => {
      const result = await setMyNightStudyChoiceForToday({ choice: selected });

      if (!result.ok || !result.choice) {
        setError(result.error ?? "Unable to save your choice.");
        return;
      }

      setSavedChoice(result.choice.choice);
      setSelected(result.choice.choice);
      setSavedMessage("Saved.");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm sm:p-6"
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">
          What&apos;s your plan for tonight?
        </legend>

        <div className="grid gap-3">
          {OPTIONS.map((option) => {
            const active = selected === option.value;
            const isSaved = savedChoice === option.value;

            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition",
                  active
                    ? "border-teal-700 bg-teal-50/60 ring-2 ring-teal-700/20"
                    : "border-black/10 hover:border-teal-700/40 hover:bg-slate-50",
                )}
              >
                <input
                  type="radio"
                  name="night-study-choice"
                  value={option.value}
                  checked={active}
                  onChange={() => {
                    setSelected(option.value);
                    setSavedMessage(null);
                  }}
                  className="mt-1 h-4 w-4 accent-teal-700"
                />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                    {isSaved ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-teal-800">
                        Current
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-slate-600">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {savedMessage && !error ? (
        <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{savedMessage}</p>
      ) : null}

      {defaultedFromPrevious && !savedChoice && !savedMessage && !error ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your previous choice is selected. Save it to use it for today.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !selected || (!isDirty && Boolean(savedChoice))}
        className="w-full rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending
          ? "Saving..."
          : savedChoice && !isDirty
            ? "Saved"
            : savedChoice
              ? "Update choice"
              : "Save choice"}
      </button>
    </form>
  );
}
