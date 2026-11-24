import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/Icons";

/** Soft wave along a card's bottom edge, as in the design reference. */
export function CardWave() {
  return (
    <svg aria-hidden viewBox="0 0 400 60" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 w-full text-rose-100 sm:h-14">
      <path d="M0 30C80 0 150 55 240 34s120-30 160-14v40H0z" fill="currentColor" />
    </svg>
  );
}

const SIZES = {
  // Landing page: large reference proportions.
  lg: {
    card: "gap-4 p-5 sm:gap-6 sm:p-7 lg:min-h-[200px]",
    icon: "h-[72px] w-[72px] sm:h-24 sm:w-24 lg:h-[116px] lg:w-[116px]",
    title: "text-[1.6rem] sm:text-[2rem] lg:text-[2.35rem]",
    body: "text-[15px] sm:text-[17px]",
  },
  // Beauty Studio chooser: same design, compact enough to show all options on a phone.
  md: {
    card: "gap-4 p-4 sm:gap-5 sm:p-6",
    icon: "h-14 w-14 sm:h-20 sm:w-20",
    title: "text-[1.35rem] sm:text-[1.7rem]",
    body: "text-[14.5px] sm:text-[16px]",
  },
};

/** Whole-card link with icon circle, title, short description and arrow. */
export function FeatureCard({
  href,
  icon,
  title,
  body,
  note,
  size = "lg",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  note?: string;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <Link
      href={href}
      className={`group relative flex items-center overflow-hidden rounded-[1.75rem] border border-rose-line bg-white/80 shadow-rose backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white active:translate-y-0 ${s.card}`}
    >
      <CardWave />
      <span className={`relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-600 to-rose-950 text-white shadow-cta ${s.icon}`}>
        {icon}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className={`block font-display font-semibold leading-tight text-ink ${s.title}`}>{title}</span>
        <span className={`mt-1 block max-w-xs leading-snug text-brand-600 ${s.body}`}>{body}</span>
        {note && <span className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">{note}</span>}
      </span>
      <span
        aria-hidden
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-100 text-ink transition group-hover:translate-x-1 group-hover:bg-rose-200 sm:h-14 sm:w-14"
      >
        <ArrowRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
    </Link>
  );
}
