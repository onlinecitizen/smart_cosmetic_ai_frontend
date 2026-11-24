import { mediaUrl } from "@/lib/api";

/**
 * Image area for a partner product.
 *
 * Shows the product's main photo when an admin has added one. Otherwise it
 * never draws a product: it shows the category in type with an explicit
 * "no photo" note, so no customer mistakes it for the real packaging.
 */
const TONES: Record<string, string> = {
  cleanser: "from-teal-50 to-teal-100",
  toner: "from-teal-50 to-[#E3EFE9]",
  serum: "from-gold-100 to-[#EBD9B9]",
  moisturizer: "from-brand-100 to-brand-200",
  sunscreen: "from-[#FBF0DC] to-gold-100",
  mask: "from-blush-50 to-blush-100",
  exfoliant: "from-blush-50 to-[#F2E4DA]",
  eye_care: "from-brand-100 to-blush-50",
};

export function ProductVisual({
  category,
  categoryLabel,
  size = "card",
  image,
  productName,
}: {
  category: string;
  categoryLabel: string;
  size?: "card" | "detail";
  image?: { url: string | null; alt_text: string | null; licence_note?: string | null } | null;
  productName?: string;
}) {
  const src = mediaUrl(image?.url);
  if (src) {
    const frame = (
      <div
        className={`relative overflow-hidden rounded-2xl bg-white ${size === "detail" ? "aspect-[4/3] sm:aspect-square" : "aspect-[16/9]"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={image?.alt_text || (productName ? `Photo of ${productName}` : "Product photo")}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
    );
    // The photo credit (licence attribution) is shown on the product page.
    if (size === "detail" && image?.licence_note) {
      return (
        <figure>
          {frame}
          <figcaption className="mt-2 text-[11px] leading-snug text-brand-500">{image.licence_note}</figcaption>
        </figure>
      );
    }
    return frame;
  }
  return (
    <div
      className={`relative grid place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${
        TONES[category] ?? "from-brand-100 to-brand-200"
      } ${size === "detail" ? "aspect-[4/3] sm:aspect-square" : "aspect-[16/9]"}`}
    >
      <div className="text-center">
        <p className={`display text-brand-700/80 ${size === "detail" ? "text-4xl" : "text-2xl"}`}>{categoryLabel}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-brand-500">No photo supplied yet</p>
      </div>
    </div>
  );
}
