import { mediaUrl } from "@/lib/api";
import { CatalogProduct } from "@/lib/catalog";
import { EDITORIAL_PHOTOS } from "@/lib/editorial";
import { LotusMark } from "@/components/ui/Icons";

/**
 * Right-hand hero visual of the landing page.
 *
 * The reference design uses a large beauty portrait. A portrait is shown only
 * when an approved, licensed photo is configured in lib/editorial.ts ("hero"
 * slot). Until then this renders a decorative rose arc with the lotus mark and,
 * when the catalogue has them, real product photos. Nothing here is generated
 * imagery or a fake product.
 */
export function HeroVisual({ products }: { products: CatalogProduct[] | null }) {
  const photo = EDITORIAL_PHOTOS.hero;
  const shots = (products ?? []).flatMap((p) => {
    const src = mediaUrl(p.images?.[0]?.url);
    return src ? [{ id: p.id, src }] : [];
  });

  if (photo) {
    return (
      <figure className="relative h-full w-full">
        <div aria-hidden className="absolute -right-24 bottom-0 h-[78%] w-[110%] rounded-tl-[999px] bg-gradient-to-br from-rose-200 to-rose-300/80" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={photo.alt} className="relative h-full w-full object-cover object-top [mask-image:linear-gradient(to_right,transparent,black_18%)]" />
        <figcaption className="absolute bottom-2 right-3 text-[10px] text-white/85">{photo.credit}</figcaption>
      </figure>
    );
  }

  const [a, b, c] = shots;
  return (
    <div aria-hidden className="relative h-full w-full">
      {/* soft rose arc, as behind the portrait in the reference */}
      <div className="absolute -right-6 bottom-0 h-[86%] w-[96%] rounded-t-[999px] bg-gradient-to-br from-rose-100 via-rose-200 to-rose-300/90 sm:-right-10" />
      <div className="absolute bottom-0 right-[8%] h-[64%] w-[72%] rounded-t-[999px] border border-white/70 bg-gradient-to-b from-white/50 to-transparent" />
      <LotusMark className="absolute left-1/2 top-[26%] h-24 w-32 -translate-x-1/2 text-rose-700/80 sm:h-32 sm:w-44" />
      {a && (
        <>
          <Shot src={a.src} className="bottom-[7%] left-1/2 h-[44%] w-[34%] -translate-x-1/2 sm:w-[30%]" />
          {b && <Shot src={b.src} className="bottom-[4%] left-[6%] h-[32%] w-[26%] -rotate-6 sm:left-[10%] sm:w-[24%]" />}
          {c && <Shot src={c.src} className="bottom-[4%] right-[6%] h-[32%] w-[26%] rotate-6 sm:right-[8%] sm:w-[24%]" />}
        </>
      )}
    </div>
  );
}

function Shot({ src, className }: { src: string; className: string }) {
  return (
    <div className={`absolute overflow-hidden rounded-3xl border-[6px] border-white bg-white shadow-rose ${className}`}>
      {/* Catalogue photos are hand-held shots, not isolated packs, so they fill the card. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full rounded-[1.1rem] object-cover" />
    </div>
  );
}
