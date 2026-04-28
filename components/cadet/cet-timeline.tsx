const SINGAPORE_TIME_ZONE = "Asia/Singapore";

type CetTimelineItem = {
  time: string;
  title: string;
  details: string;
};

const WEEKDAY_TEMPLATES: Record<string, { label: string; items: CetTimelineItem[] }> = {
  Monday: {
    label: "Usual Lab",
    items: [
      { time: "AM", title: "Morning routine", details: "Prepare for the training day." },
      { time: "Day", title: "Lab", details: "Usual lab training template." },
      { time: "PM", title: "Evening routine", details: "Follow unit instructions for end-of-day activities." },
    ],
  },
  Tuesday: {
    label: "Usual Lab",
    items: [
      { time: "AM", title: "Morning routine", details: "Prepare for the training day." },
      { time: "Day", title: "Lab", details: "Usual lab training template." },
      { time: "PM", title: "Evening routine", details: "Follow unit instructions for end-of-day activities." },
    ],
  },
  Wednesday: {
    label: "Usual PT + Lab",
    items: [
      { time: "AM", title: "PT", details: "Usual physical training template." },
      { time: "Day", title: "Lab", details: "Continue with lab training after PT." },
      { time: "PM", title: "Evening routine", details: "Follow unit instructions for end-of-day activities." },
    ],
  },
  Thursday: {
    label: "Usual Lab",
    items: [
      { time: "AM", title: "Morning routine", details: "Prepare for the training day." },
      { time: "Day", title: "Lab", details: "Usual lab training template." },
      { time: "PM", title: "Evening routine", details: "Follow unit instructions for end-of-day activities." },
    ],
  },
  Friday: {
    label: "Usual PT + Lab",
    items: [
      { time: "AM", title: "PT", details: "Usual physical training template." },
      { time: "Day", title: "Lab", details: "Continue with lab training after PT." },
      { time: "PM", title: "Evening routine", details: "Follow unit instructions for end-of-day activities." },
    ],
  },
};

function getSingaporeDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    weekday: get("weekday"),
    dateLabel: `${get("day")} ${get("month")} ${get("year")}`,
  };
}

export function CetTimeline({ now = new Date() }: { now?: Date }) {
  const { weekday, dateLabel } = getSingaporeDateParts(now);
  const template = WEEKDAY_TEMPLATES[weekday];

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
            CET Timeline
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {template?.label ?? "Rest Day"}
          </h2>
        </div>
        <p className="text-sm font-medium text-slate-600">
          {weekday}, {dateLabel}
        </p>
      </div>

      {template ? (
        <ol className="mt-5 space-y-3">
          {template.items.map((item) => (
            <li
              key={`${item.time}-${item.title}`}
              className="grid gap-3 rounded-2xl border border-black/10 bg-slate-50/80 p-4 sm:grid-cols-[5rem_1fr] sm:items-start"
            >
              <p className="text-sm font-semibold text-teal-700">{item.time}</p>
              <div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.details}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-slate-50/70 p-5">
          <p className="font-semibold text-slate-900">No CET template scheduled.</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Saturday and Sunday are shown as rest days for now.
          </p>
        </div>
      )}
    </section>
  );
}
