"use client";

import { useEffect, useState } from "react";

export const ANALYSIS_MESSAGES = [
  "Detecting facial region...",
  "Analyzing visible characteristics...",
  "Evaluating skin profile...",
  "Reading environmental conditions...",
  "Building personalized profile...",
];

/** Milliseconds each message stays active; the page waits at least this long in total. */
export const ANALYSIS_STEP_MS = 950;

export function AnalysisSequence({ photoUrl }: { photoUrl: string | null }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => Math.min(i + 1, ANALYSIS_MESSAGES.length - 1)), ANALYSIS_STEP_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-xs">
        <span className="pulse-ring absolute inset-0 rounded-[50%] border border-gold-500" aria-hidden />
        <div className="absolute inset-0 overflow-hidden rounded-[50%] border border-gold-500/60 bg-brand-900 shadow-lift">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover opacity-80" />
          )}
          <div
            className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.35)_1px,transparent_1.5px)] [background-size:14px_14px] opacity-40"
            aria-hidden
          />
          <div
            className="scan-line absolute inset-x-0 h-16 -translate-y-1/2 bg-gradient-to-b from-transparent via-gold-300/60 to-transparent"
            aria-hidden
          />
        </div>
      </div>

      <div>
        <p className="eyebrow">Step 02 · Analyze</p>
        <h2 className="display mt-4 text-4xl sm:text-5xl">Analyzing your skin</h2>
        <ul className="mt-8 space-y-4" aria-live="polite">
          {ANALYSIS_MESSAGES.map((m, i) => (
            <li
              key={m}
              className={`flex items-center gap-4 text-sm transition-all duration-500 ${
                i <= index ? "translate-x-0 opacity-100" : "translate-x-2 opacity-25"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
                  i < index ? "border-brand-900 bg-brand-900 text-brand-50" : "border-brand-300"
                }`}
              >
                {i < index ? (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                    <path d="M2.5 6.5l2.2 2L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : i === index ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
                ) : null}
              </span>
              <span className={i === index ? "text-brand-900" : "text-brand-600"}>{m}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-brand-400">Cosmetic estimate — not a medical diagnosis.</p>
      </div>
    </div>
  );
}
