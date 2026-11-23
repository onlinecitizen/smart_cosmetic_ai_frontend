import { EDITORIAL_PHOTOS, EditorialSlot } from "@/lib/editorial";

/**
 * Editorial image area. Shows an approved photo when one is configured in
 * lib/editorial.ts; otherwise an art-directed illustration inspired by Stone
 * Town arches, the Indian Ocean and late-afternoon light. Decorative only.
 */
export function EditorialVisual({ variant, className = "" }: { variant: EditorialSlot; className?: string }) {
  const photo = EDITORIAL_PHOTOS[variant];
  if (photo) {
    return (
      <figure className={`relative overflow-hidden rounded-[2rem] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
        <figcaption className="absolute bottom-3 right-4 text-[10px] text-white/80">{photo.credit}</figcaption>
      </figure>
    );
  }

  const studio = variant === "studio";
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-gold-100 via-[#F1DFC6] to-[#E7CDAF] ${className}`}
    >
      {/* late-afternoon sun */}
      <div className="absolute right-[14%] top-[12%] h-28 w-28 rounded-full bg-gradient-to-br from-blush-100 to-blush-300 opacity-90 blur-[1px] sm:h-36 sm:w-36" />
      {/* carved arch, Stone Town doorway proportions */}
      <div className="absolute bottom-0 left-1/2 h-[78%] w-[58%] -translate-x-1/2 rounded-t-[999px] border-[10px] border-b-0 border-[#F8EEDF] bg-gradient-to-b from-teal-100 via-teal-300 to-teal-700 shadow-[inset_0_0_0_1px_rgba(125,99,52,0.25)] sm:border-[14px]">
        {/* horizon and sea light */}
        <div className="absolute inset-x-0 top-[46%] h-px bg-white/60" />
        <div className="absolute inset-x-[12%] top-[52%] h-[3px] rounded-full bg-white/40" />
        <div className="absolute inset-x-[22%] top-[60%] h-[2px] rounded-full bg-white/30" />
        {/* dhow sail */}
        <div className="absolute left-[30%] top-[30%] h-0 w-0 border-b-[34px] border-l-[22px] border-b-[#FBF8F3]/90 border-l-transparent" />
        <div className="absolute left-[27%] top-[calc(30%+34px)] h-[5px] w-[38px] rounded-b-full bg-[#3A342D]/70" />
      </div>
      {/* studded door detail */}
      <div className="absolute bottom-0 left-1/2 flex h-[10%] w-[58%] -translate-x-1/2 items-center justify-around px-6">
        {Array.from({ length: studio ? 5 : 7 }).map((_, i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-gold-700/60" />
        ))}
      </div>
      {/* blush petals */}
      <div className="absolute bottom-[14%] left-[8%] h-16 w-10 rotate-[-24deg] rounded-[60%_40%_60%_40%] bg-blush-300/80" />
      <div className="absolute bottom-[8%] left-[14%] h-12 w-8 rotate-[18deg] rounded-[60%_40%_60%_40%] bg-blush-500/50" />
      <div className="absolute bottom-[20%] right-[9%] h-14 w-9 rotate-[30deg] rounded-[60%_40%_60%_40%] bg-blush-300/70" />
    </div>
  );
}
