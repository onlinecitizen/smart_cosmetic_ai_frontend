"use client";

import { useRef, useState } from "react";
import { NoPhoto } from "@/components/catalog/ProductTile";
import { mediaUrl } from "@/lib/api";
import type { CatalogProduct } from "@/lib/catalog";

type Img = NonNullable<CatalogProduct["images"]>[number];

/**
 * Product photos: swipe (or use the dots/thumbnails) between the listing's own
 * photos, main photo first. Each photo's credit (licence) is shown under it.
 * `overlay` holds the back / save buttons drawn on top.
 */
export function ProductGallery({
  images,
  productName,
  fallbackLabel,
  overlay,
}: {
  images: Img[] | undefined;
  productName: string;
  fallbackLabel: string;
  overlay?: React.ReactNode;
}) {
  const photos = (images ?? []).filter((i) => mediaUrl(i.url));
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIndex(i);
  }

  const frame = "relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-peach-50 via-peach-100 to-blush-100 sm:aspect-square sm:rounded-3xl";

  if (photos.length === 0) {
    return (
      <div className={frame}>
        <NoPhoto label={fallbackLabel} />
        {overlay}
      </div>
    );
  }

  const credit = photos[index]?.licence_note;

  return (
    <figure>
      <div className={frame}>
        <div
          ref={track}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
            if (i !== index) setIndex(i);
          }}
          aria-label={photos.length > 1 ? `${photos.length} photos of ${productName}` : undefined}
          role={photos.length > 1 ? "region" : undefined}
          tabIndex={photos.length > 1 ? 0 : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" && index < photos.length - 1) go(index + 1);
            if (e.key === "ArrowLeft" && index > 0) go(index - 1);
          }}
        >
          {photos.map((p, i) => (
            <div key={p.id} className="h-full w-full shrink-0 snap-center px-8 pb-10 pt-16 sm:p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(p.url) ?? undefined}
                alt={p.alt_text || `Photo ${i + 1} of ${productName}`}
                className="h-full w-full object-contain mix-blend-multiply drop-shadow-[0_18px_24px_rgba(120,72,48,0.18)]"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-teal-700" : "w-2 bg-brand-300/80 hover:bg-brand-400"}`}
              />
            ))}
          </div>
        )}
        {overlay}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 hidden gap-2 sm:flex">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              className={`h-16 w-16 overflow-hidden rounded-xl border-2 bg-peach-50 p-1 transition ${i === index ? "border-teal-700" : "border-transparent hover:border-peach-300"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(p.url) ?? undefined} alt="" className="h-full w-full object-contain mix-blend-multiply" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {credit && <figcaption className="mt-2 px-4 text-[10.5px] leading-snug text-brand-500 sm:px-0">{credit}</figcaption>}
    </figure>
  );
}
