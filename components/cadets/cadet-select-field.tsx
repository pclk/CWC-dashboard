"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { getCadetFullDisplayName, getCadetShorthand } from "@/lib/cadet-names";
import { cn } from "@/lib/utils";

type CadetOption = {
  id: string;
  rank: string;
  displayName: string;
  shorthand?: string | null;
  active: boolean;
};

function getCadetSearchValues(cadet: CadetOption) {
  const fullDisplayName = getCadetFullDisplayName(cadet);
  const shorthand = getCadetShorthand(cadet);

  return Array.from(
    new Set(
      [
        cadet.rank,
        fullDisplayName,
        shorthand,
        [cadet.rank, fullDisplayName].filter(Boolean).join(" "),
        shorthand ? [cadet.rank, shorthand].filter(Boolean).join(" ") : null,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase()),
    ),
  );
}

function matchesCadetSearch(cadet: CadetOption, query: string) {
  return getCadetSearchValues(cadet).some((value) => value.includes(query));
}

function getCadetLabel(cadet: CadetOption) {
  const fullDisplayName = getCadetFullDisplayName(cadet);
  const shorthand = getCadetShorthand(cadet);

  if (shorthand && shorthand.toLowerCase() !== fullDisplayName.toLowerCase()) {
    return `${cadet.rank} ${fullDisplayName} (${shorthand})`;
  }

  return `${cadet.rank} ${fullDisplayName}`;
}

function syncCadetInputValidity(
  input: HTMLInputElement | null,
  required: boolean | undefined,
  nextSelectedCadetId: string,
  nextSearchQuery: string,
) {
  if (!input) {
    return;
  }

  if (!required || nextSelectedCadetId || !nextSearchQuery.trim()) {
    input.setCustomValidity("");
    return;
  }

  input.setCustomValidity("Select a cadet from the list.");
}

export function CadetSelectField({
  cadets,
  defaultValue = "",
  name,
  required,
}: {
  cadets: CadetOption[];
  defaultValue?: string;
  name: string;
  required?: boolean;
}) {
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCadetId, setSelectedCadetId] = useState(defaultValue);
  const defaultCadet = cadets.find((cadet) => cadet.id === defaultValue);
  const [searchQuery, setSearchQuery] = useState(defaultCadet ? getCadetLabel(defaultCadet) : "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const availableCadets = cadets.filter(
    (cadet) => cadet.active || cadet.id === defaultValue || cadet.id === selectedCadetId,
  );
  const selectedCadet = availableCadets.find((cadet) => cadet.id === selectedCadetId);
  const selectedLabel = selectedCadet ? getCadetLabel(selectedCadet) : "";
  const normalizedQuery =
    isOpen && selectedLabel && searchQuery === selectedLabel ? "" : searchQuery.trim().toLowerCase();
  let visibleCadets = normalizedQuery
    ? availableCadets.filter((cadet) => matchesCadetSearch(cadet, normalizedQuery))
    : availableCadets;

  if (selectedCadet && !visibleCadets.some((cadet) => cadet.id === selectedCadet.id)) {
    visibleCadets = [selectedCadet, ...visibleCadets];
  }

  function selectCadet(cadet: CadetOption) {
    const nextLabel = getCadetLabel(cadet);
    setSelectedCadetId(cadet.id);
    setSearchQuery(nextLabel);
    setIsOpen(false);
    setActiveIndex(0);
    syncCadetInputValidity(inputRef.current, required, cadet.id, nextLabel);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
      syncCadetInputValidity(inputRef.current, required, selectedCadetId, searchQuery);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, required, searchQuery, selectedCadetId]);

  return (
    <div ref={rootRef} className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Cadet</label>
      <div className="relative">
        <input type="hidden" name={name} value={selectedCadetId} />
        <label htmlFor={inputId} className="sr-only">
          Select cadet
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={searchQuery}
          required={required}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="Select or search cadet"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && visibleCadets[activeIndex] ? `${listboxId}-${visibleCadets[activeIndex].id}` : undefined
          }
          onFocus={(event) => {
            setIsOpen(true);
            setActiveIndex(0);

            if (selectedLabel && searchQuery === selectedLabel) {
              event.currentTarget.select();
            }
          }}
          onChange={(event) => {
            const nextQuery = event.target.value;
            const normalizedNextQuery = nextQuery.trim().toLowerCase();
            const exactMatch = availableCadets.find(
              (cadet) =>
                getCadetLabel(cadet).toLowerCase() === normalizedNextQuery ||
                getCadetSearchValues(cadet).some((value) => value === normalizedNextQuery),
            );

            setSearchQuery(nextQuery);
            setSelectedCadetId(exactMatch?.id ?? "");
            setIsOpen(true);
            setActiveIndex(0);
            syncCadetInputValidity(inputRef.current, required, exactMatch?.id ?? "", nextQuery);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (rootRef.current?.contains(document.activeElement)) {
                return;
              }

              setIsOpen(false);
              syncCadetInputValidity(inputRef.current, required, selectedCadetId, searchQuery);
            }, 0);
          }}
          onInvalid={(event) =>
            syncCadetInputValidity(inputRef.current, required, selectedCadetId, event.currentTarget.value)
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleCadets.length - 1, 0)));
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => Math.max(current - 1, 0));
              return;
            }

            if (event.key === "Enter" && isOpen && visibleCadets[activeIndex]) {
              event.preventDefault();
              selectCadet(visibleCadets[activeIndex]);
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setIsOpen(false);
              setActiveIndex(0);

              if (selectedCadet) {
                setSearchQuery(selectedLabel);
                syncCadetInputValidity(inputRef.current, required, selectedCadet.id, selectedLabel);
              }
            }
          }}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 pr-12 outline-none focus:border-teal-700"
        />
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

        {isOpen ? (
          <div
            role="listbox"
            id={listboxId}
            className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-lg"
          >
            {visibleCadets.length ? (
              visibleCadets.map((cadet, index) => (
                <button
                  key={cadet.id}
                  id={`${listboxId}-${cadet.id}`}
                  type="button"
                  role="option"
                  aria-selected={selectedCadetId === cadet.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCadet(cadet)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                    index === activeIndex || selectedCadetId === cadet.id
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{getCadetLabel(cadet)}</span>
                  </span>
                  <Check
                    className={cn(
                      "ml-3 size-4 shrink-0 text-teal-700",
                      selectedCadetId === cadet.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">No cadets match the search.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
