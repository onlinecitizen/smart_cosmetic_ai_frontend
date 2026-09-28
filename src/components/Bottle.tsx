"use client";

import { useId } from "react";
import { BOTTLE_SIZE_LABEL } from "@/lib/product";
import { useInView } from "./Reveal";

/**
 * Luxury serum bottle drawn in SVG (no 3D engine). The liquid fills, the
 * label and formula code fade in once the bottle scrolls into view (or
 * immediately when `revealed` is forced). Light sweep, shimmer, rising
 * particles, floating and a breathing shadow run as CSS animations and are
 * disabled for users who prefer reduced motion.
 */
export function Bottle({
  name,
  code,
  revealed,
  float = true,
  className = "",
}: {
  name?: string;
  code?: string;
  revealed?: boolean;
  float?: boolean;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const isRevealed = revealed ?? inView;
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${s}-${uid}`;

  const label = (name || "").toUpperCase().slice(0, 14);

  return (
    <div ref={ref} className={`relative ${className}`} data-revealed={isRevealed ? "true" : "false"}>
      <div className="absolute inset-x-[10%] top-[18%] bottom-[12%] rounded-full bg-gold-300/40 blur-3xl" aria-hidden />
      <svg
        viewBox="0 0 200 440"
        className="relative h-full w-full overflow-visible"
        role="img"
        aria-label={`Personalized serum bottle${code ? `, formula ${code}` : ""}`}
      >
        <defs>
          <linearGradient id={id("glass")} x1="0" x2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="0.8" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="1" stopColor="#E8DDCC" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={id("liquid")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#F1D9A8" />
            <stop offset="0.55" stopColor="#DDB36F" />
            <stop offset="1" stopColor="#B7843F" />
          </linearGradient>
          <linearGradient id={id("liquidSide")} x1="0" x2="1">
            <stop offset="0" stopColor="#8A5E25" stopOpacity="0.35" />
            <stop offset="0.3" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.75" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="1" stopColor="#8A5E25" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={id("cap")} x1="0" x2="1">
            <stop offset="0" stopColor="#2A2621" />
            <stop offset="0.45" stopColor="#57504A" />
            <stop offset="1" stopColor="#1C1A17" />
          </linearGradient>
          <linearGradient id={id("collar")} x1="0" x2="1">
            <stop offset="0" stopColor="#9C7E45" />
            <stop offset="0.4" stopColor="#F3E7CF" />
            <stop offset="0.7" stopColor="#C8A96E" />
            <stop offset="1" stopColor="#9C7E45" />
          </linearGradient>
          <linearGradient id={id("sweep")} x1="0" x2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={id("shadow")}>
            <stop offset="0" stopColor="#1C1A17" stopOpacity="0.45" />
            <stop offset="1" stopColor="#1C1A17" stopOpacity="0" />
          </radialGradient>
          <clipPath id={id("body")}>
            <rect x="36" y="118" width="128" height="290" rx="30" />
          </clipPath>
        </defs>

        {/* Floor shadow */}
        <ellipse className="bottle-shadow" cx="100" cy="428" rx="78" ry="9" fill={`url(#${id("shadow")})`} />

        <g className={float ? "animate-float" : ""}>
          {/* Dropper bulb + collar */}
          <path d="M80 70 C80 20 120 20 120 70 L120 78 L80 78 Z" fill={`url(#${id("cap")})`} />
          <rect x="84" y="30" width="5" height="40" rx="2.5" fill="#FFFFFF" opacity="0.18" />
          <rect x="68" y="76" width="64" height="30" rx="5" fill={`url(#${id("collar")})`} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={74 + i * 8} y="79" width="1.2" height="24" fill="#6F5630" opacity="0.35" />
          ))}
          <rect x="82" y="104" width="36" height="16" rx="3" fill="#E8DDCC" opacity="0.9" />

          {/* Glass body */}
          <g clipPath={`url(#${id("body")})`}>
            <rect x="36" y="118" width="128" height="290" fill="#FBF8F3" opacity="0.5" />
            <g className="bottle-liquid">
              <rect x="36" y="160" width="128" height="248" fill={`url(#${id("liquid")})`} />
              <rect x="36" y="160" width="128" height="248" fill={`url(#${id("liquidSide")})`} />
              <ellipse cx="100" cy="160" rx="64" ry="5" fill="#F7E6C4" opacity="0.9" />
              <rect className="bottle-shimmer" x="36" y="160" width="128" height="248" fill="#FFF6E3" />
            </g>
            {[
              [62, 392, 2.2, "0s"],
              [88, 400, 1.6, "1.2s"],
              [118, 396, 2.6, "2.1s"],
              [140, 402, 1.8, "0.6s"],
              [104, 404, 1.4, "3s"],
              [74, 398, 1.2, "3.8s"],
            ].map(([cx, cy, r, delay], i) => (
              <circle
                key={i}
                className="bottle-particle"
                cx={cx as number}
                cy={cy as number}
                r={r as number}
                fill="#FFFFFF"
                style={{ animationDelay: delay as string }}
              />
            ))}
            <rect className="bottle-sweep" x="0" y="110" width="46" height="310" fill={`url(#${id("sweep")})`} />
          </g>
          <rect
            x="36"
            y="118"
            width="128"
            height="290"
            rx="30"
            fill={`url(#${id("glass")})`}
            stroke="#FFFFFF"
            strokeOpacity="0.8"
            strokeWidth="1.5"
          />
          {/* Reflections */}
          <rect x="46" y="134" width="7" height="256" rx="3.5" fill="#FFFFFF" opacity="0.55" />
          <rect x="57" y="140" width="2" height="230" rx="1" fill="#FFFFFF" opacity="0.35" />
          <rect x="148" y="150" width="3" height="220" rx="1.5" fill="#FFFFFF" opacity="0.25" />

          {/* Label */}
          <g className="bottle-label">
            <rect x="52" y="224" width="96" height="128" rx="6" fill="#FBF8F3" opacity="0.94" />
            <rect x="56" y="228" width="88" height="120" rx="4" fill="none" stroke="#C8A96E" strokeWidth="0.6" />
            <text x="100" y="246" textAnchor="middle" fontSize="6" letterSpacing="1.6" fill="#6F6150">
              SMART COSMETIC AI
            </text>
            <line x1="84" x2="116" y1="253" y2="253" stroke="#C8A96E" strokeWidth="0.6" />
            <text x="100" y="272" textAnchor="middle" fontSize="12" className="font-display" fill="#1C1A17">
              Personalized
            </text>
            <text x="100" y="286" textAnchor="middle" fontSize="12" className="font-display" fill="#1C1A17">
              Serum
            </text>
            {label && (
              <text x="100" y="306" textAnchor="middle" fontSize="8.5" letterSpacing="2" fill="#9C7E45">
                {label}
              </text>
            )}
            <text x="100" y="340" textAnchor="middle" fontSize="5.5" letterSpacing="1.2" fill="#8E7C64">
              {BOTTLE_SIZE_LABEL.toUpperCase()}
            </text>
          </g>
          <text
            className="bottle-code"
            x="100"
            y="326"
            textAnchor="middle"
            fontSize="7"
            letterSpacing="1.2"
            fontFamily="ui-monospace, monospace"
            fill="#3A342D"
          >
            {code || "FORMULA-····"}
          </text>
        </g>
      </svg>
    </div>
  );
}
