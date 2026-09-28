const STEPS = ["Capture", "Analyze", "Personalize", "Formula"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="grid grid-cols-4 gap-2 sm:gap-4" aria-label="Assessment progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "todo";
        return (
          <li key={label} aria-current={state === "active" ? "step" : undefined}>
            <div className="h-px w-full overflow-hidden bg-brand-200">
              <div
                className={`h-full bg-brand-900 transition-all duration-700 ${state === "todo" ? "w-0" : "w-full"}`}
              />
            </div>
            <p
              className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                state === "todo" ? "text-brand-300" : "text-brand-900"
              }`}
            >
              <span className="hidden sm:inline">Step </span>0{n}
            </p>
            <p
              className={`font-display text-base transition-colors sm:text-xl ${
                state === "todo" ? "text-brand-300" : state === "active" ? "text-gold-700" : "text-brand-700"
              }`}
            >
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
