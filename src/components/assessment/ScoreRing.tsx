"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/components/Reveal";

/** Animated ring for a 0.0-1.0 score; the number counts up as the ring draws. */
export function ScoreRing({
  label,
  value,
  helpText,
  delay = 0,
}: {
  label: string;
  value: number;
  helpText: string;
  delay?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [shown, setShown] = useState(0);
  const target = Math.round(Math.max(0, Math.min(1, value)) * 100);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now() + delay;
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, delay]);

  const r = 44;
  const circumference = 2 * Math.PI * r;

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <div className="relative h-28 w-28 sm:h-32 sm:w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E8DDCC" strokeWidth="3" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="url(#ring-gold)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown / 100)}
          />
          <defs>
            <linearGradient id="ring-gold" x1="0" x2="1">
              <stop offset="0" stopColor="#DFC596" />
              <stop offset="1" stopColor="#9C7E45" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="display text-3xl sm:text-4xl">
            {shown}
            <span className="text-base text-brand-400">%</span>
          </span>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-900">{label}</p>
      <p className="mt-1 max-w-[12rem] text-xs leading-relaxed text-brand-400">{helpText}</p>
    </div>
  );
}
