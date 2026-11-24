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
