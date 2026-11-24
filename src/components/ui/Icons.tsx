/** Small line icons shared by the shop pages. Decorative: always pair with a text label. */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SearchIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export function FilterIcon({ className = "h-[18px] w-[18px]" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

export function HeartIcon({ filled, className = "h-[18px] w-[18px]" }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} className={className} strokeWidth="1.7" fill={filled ? "currentColor" : "none"}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

export function BackIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** WhatsApp-style chat bubble (generic outline, not the trademark logo). */
export function ChatIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.7">
      <path d="M4.5 19.5 5.6 16A7.5 7.5 0 1 1 8.4 18.6z" />
      <path d="M9.5 9.5c.3 1.9 2.1 3.8 4 4.2l1-1.1 1.6.8c-.2.9-1 1.6-2 1.5-2.9-.3-5.5-2.9-5.8-5.8 0-1 .6-1.8 1.5-2l.8 1.6z" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function SparkleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.6" fill="currentColor">
      <path d="M10 3.5 11.6 8.4 16.5 10l-4.9 1.6L10 16.5 8.4 11.6 3.5 10l4.9-1.6zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </svg>
  );
}

export function MicIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </svg>
  );
}

/** Camera framing corners around a face outline (no medical or laser imagery). */
export function ScanIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <circle cx="12" cy="12" r="3.6" />
    </svg>
  );
}

export function MessageIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  );
}

export function BagIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <path d="M5.5 8h13l-1 12h-11zM9 8a3 3 0 0 1 6 0" />
    </svg>
  );
}

export function UserIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth="1.8">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

/** Lotus line mark used for the Smart Cosmetic AI brand (design pack motif). */
export function LotusMark({ className = "h-10 w-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden className={className}>
      <path d="M32 6c6 6 8.5 13 8.5 19.5S37 38 32 42c-5-4-8.5-10-8.5-16.5S26 12 32 6z" />
      <path d="M24.5 17.5C18 15 12 15.5 8 17c1 8 5 16 13 21 3.5 2.2 7.5 3.5 11 4" />
      <path d="M39.5 17.5C46 15 52 15.5 56 17c-1 8-5 16-13 21-3.5 2.2-7.5 3.5-11 4" />
      <path d="M8 17c-3 1.5-5 3.5-6 5.5 4 9 14 17 30 19.5M56 17c3 1.5 5 3.5 6 5.5-4 9-14 17-30 19.5" />
    </svg>
  );
}

/** Small sprout used as a decorative accent on the landing banner. */
export function SproutIcon({ className = "h-8 w-8" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className={className}>
      <path d="M16 29V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M15 18C8 18 4 13.5 4 7c7 0 11 4.5 11 11z" />
      <path d="M17 15.5c0-6.5 4-10.5 11-10.5 0 7-4 10.5-11 10.5z" />
    </svg>
  );
}
