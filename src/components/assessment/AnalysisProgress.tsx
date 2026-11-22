"use client";

/**
 * Progress for the three real backend calls made after capture. Each step is
 * marked done only when its request has actually returned - there is no
 * scripted timing (DESIGN.md "Copy rules": never animate work that isn't
 * happening).
 */
export type StepState = "pending" | "active" | "done" | "error";

export const ANALYSIS_STEPS = [
  { key: "photo", label: "Checking photo quality and scoring your skin" },
  { key: "climate", label: "Recording your local climate" },
  { key: "formula", label: "Applying formulation rules and checking limits" },
] as const;

export type AnalysisStepKey = (typeof ANALYSIS_STEPS)[number]["key"];

export function AnalysisProgress({
  states,
  photoUrl,
}: {
  states: Record<AnalysisStepKey, StepState>;
  photoUrl: string | null;
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[14rem] sm:max-w-xs">
        <span className="pulse-ring absolute inset-0 rounded-[50%] border border-gold-500" aria-hidden />
        <div className="absolute inset-0 overflow-hidden rounded-[50%] border border-gold-500/60 bg-brand-900 shadow-lift">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover opacity-80" />
          )}
        </div>
      </div>

      <div>
        <p className="eyebrow">Step 02 · Analyze</p>
        <h2 className="display mt-4 text-4xl sm:text-5xl">Working on it</h2>
        <ol className="mt-8 space-y-4" aria-live="polite">
          {ANALYSIS_STEPS.map((step) => {
            const state = states[step.key];
            return (
              <li key={step.key} className="flex items-center gap-4 text-sm" data-state={state}>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                    state === "done"
                      ? "border-brand-900 bg-brand-900 text-brand-50"
                      : state === "error"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-brand-300"
                  }`}
                  aria-hidden
                >
                  {state === "done" && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3">
                      <path d="M2.5 6.5l2.2 2L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                  {state === "active" && <span className="h-2 w-2 animate-pulse rounded-full bg-gold-700" />}
                  {state === "error" && "!"}
                </span>
                <span className={state === "pending" ? "text-brand-500" : "text-brand-900"}>
                  {step.label}
                  <span className="sr-only">
                    {state === "done" ? " — done" : state === "active" ? " — in progress" : state === "error" ? " — failed" : " — waiting"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 text-xs text-brand-500">Cosmetic estimate — not a medical diagnosis.</p>
      </div>
    </div>
  );
}
