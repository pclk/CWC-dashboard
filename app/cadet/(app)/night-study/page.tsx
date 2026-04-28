import { getMyNightStudyChoiceContext } from "@/actions/cadet-night-study";
import { CadetNightStudyForm } from "@/components/cadet/night-study-form";
import { formatDateLabel } from "@/lib/date";

export const dynamic = "force-dynamic";

const CHOICE_LABELS: Record<string, string> = {
  NIGHT_STUDY: "Night study",
  EARLY_PARTY: "Early party",
  GO_BACK_BUNK: "Go back bunk",
};

export default async function CadetNightStudyPage() {
  const today = formatDateLabel(new Date());
  const { todayChoice, defaultChoice } = await getMyNightStudyChoiceContext();
  const isDefaultedFromPrevious = !todayChoice && Boolean(defaultChoice);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
          Night Study
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Night Study
        </h1>
        <p className="mt-2 text-sm text-slate-500">{today}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pick your plan for tonight. Your choice helps the CWC see who&apos;s at night study, in the
          early party, or heading back to bunk. You can update it anytime today.
        </p>
        {todayChoice ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            Current choice: {CHOICE_LABELS[todayChoice.choice] ?? todayChoice.choice}
          </p>
        ) : defaultChoice ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
            Defaulted to previous choice: {CHOICE_LABELS[defaultChoice.choice] ?? defaultChoice.choice}
          </p>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            You haven&apos;t made a choice for today yet.
          </p>
        )}
      </section>

      <CadetNightStudyForm
        initialChoice={defaultChoice?.choice ?? null}
        savedChoice={todayChoice?.choice ?? null}
        defaultedFromPrevious={isDefaultedFromPrevious}
      />
    </div>
  );
}
