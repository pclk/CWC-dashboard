"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

function normalizeSuggestionList(suggestions: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const suggestion of suggestions) {
    const trimmed = suggestion.trim();

    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}

export function SearchableCombobox({
  label,
  value,
  onValueChange,
  suggestions,
  placeholder,
  emptyMessage = "No matches found.",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  emptyMessage?: string;
}) {
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const availableSuggestions = normalizeSuggestionList(suggestions);
  const normalizedQuery = value.trim().toLowerCase();
  const visibleSuggestions = normalizedQuery
    ? availableSuggestions.filter((suggestion) => suggestion.toLowerCase().includes(normalizedQuery))
    : availableSuggestions;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
      setActiveIndex(0);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={value}
          autoCorrect="off"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && visibleSuggestions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
          }
          onFocus={(event) => {
            setIsOpen(true);
            setActiveIndex(0);

            if (event.currentTarget.value) {
              event.currentTarget.select();
            }
          }}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (rootRef.current?.contains(document.activeElement)) {
                return;
              }

              setIsOpen(false);
              setActiveIndex(0);
            }, 0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleSuggestions.length - 1, 0)));
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
              return;
            }

            if (event.key === "Enter") {
              if (isOpen && visibleSuggestions[activeIndex]) {
                event.preventDefault();
                onValueChange(visibleSuggestions[activeIndex]);
              }

              setIsOpen(false);
              setActiveIndex(0);
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setIsOpen(false);
              setActiveIndex(0);
            }
          }}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-12 outline-none focus:border-teal-700"
        />
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-lg"
          >
            {visibleSuggestions.length ? (
              visibleSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={value.trim().toLowerCase() === suggestion.toLowerCase()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onValueChange(suggestion);
                    setIsOpen(false);
                    setActiveIndex(0);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                    index === activeIndex || value.trim().toLowerCase() === suggestion.toLowerCase()
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="truncate">{suggestion}</span>
                  <Check
                    className={cn(
                      "ml-3 size-4 shrink-0 text-teal-700",
                      value.trim().toLowerCase() === suggestion.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
