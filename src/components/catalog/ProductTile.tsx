"use client";

import Link from "next/link";
import { HeartIcon } from "@/components/ui/Icons";
import { mediaUrl } from "@/lib/api";
import type { CatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/product";
import { useSaved } from "@/lib/saved";

/** Heart toggle. Saved products are kept on this device (lib/saved.ts). */
export function SaveButton({ productId, productName, className = "" }: { productId: string; productName: string; className?: string }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from saved` : `Save ${productName}`}
      className={`icon-btn ${saved ? "!text-blush-700" : ""} ${className}`}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

/** Placeholder when a listing has no photo: never a drawing of a product. */
export function NoPhoto({ label }: { label: string }) {
  return (
    <div className="grid h-full w-full place-items-center px-3 text-center">
      <div>
        <p className="display text-lg leading-tight text-brand-700/80">{label}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-brand-500">No photo yet</p>
      </div>
    </div>
  );
}

/**
 * Compact product card for the two-column grid: photo, name, price (only when
 * the listing has one) and a category label. Everything else is on the
 * product page.
 */
export function ProductTile({
  product,
  groupLabel,
  headingLevel = "h2",
}: {
  product: CatalogProduct;
  /** Top-level category label, e.g. "Fragrance". */
  groupLabel: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const image = product.images?.[0];
  const src = mediaUrl(image?.url);
  const href = `/products/${product.id}`;

  return (
    <article className="tile group">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-peach-50 to-peach-100">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={image?.alt_text || `Photo of ${product.name}`}
            className="absolute inset-0 h-full w-full object-contain p-3 mix-blend-multiply transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <NoPhoto label={groupLabel} />
        )}
        {product.is_test_fixture && (
          <span
            className="absolute left-2 top-2 rounded-full border border-amber-300 bg-amber-50/95 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-amber-900"
            title="Test fixture: a demo listing, not sold by a partner shop"
          >
            Demo
          </span>
        )}
        <SaveButton productId={product.id} productName={product.name} className="absolute right-2 top-2 z-10 !h-8 !w-8" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-500">{product.brand}</p>}
        <Heading className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-brand-900">
          {/* Stretched link: the whole tile opens the product, the heart stays its own button. */}
          <Link href={href} className="rounded-sm after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </Heading>
        <div className="mt-auto pt-1">
          {product.price_amount != null ? (
            <p className="text-[15px] font-bold text-brand-900">{formatPrice(product.price_amount, product.currency)}</p>
          ) : (
            <p className="text-xs text-brand-500">Price not listed</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="tag">{groupLabel}</span>
            {product.availability === "out_of_stock" && <span className="text-[11px] font-medium text-brand-500">Out of stock</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
