import Link from "next/link";
import { ProductVisual } from "@/components/catalog/ProductVisual";
import { DemoBadge } from "@/components/ui/States";
import { AVAILABILITY_LABEL, CatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/lib/product";

export function TestFixtureBadge() {
  return <DemoBadge>Test fixture</DemoBadge>;
}

/** A partner product card. Shows only attributes the backend provides. */
export function CatalogProductCard({
  product,
  categoryLabel,
  children,
  headingLevel = "h2",
}: {
  product: CatalogProduct;
  categoryLabel: (code: string) => string;
  /** Extra content, e.g. recommendation reasons. */
  children?: React.ReactNode;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const price = product.price_amount != null ? formatPrice(product.price_amount, product.currency) : "Price not provided";

  return (
    <article className="card flex h-full flex-col !p-4 sm:!p-5">
      <Link href={`/products/${product.id}`} tabIndex={-1} aria-hidden className="mb-4 block">
        <ProductVisual
          category={product.category}
          categoryLabel={categoryLabel(product.category)}
          image={product.images?.[0]}
          productName={product.name}
        />
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{categoryLabel(product.category)}</span>
        {product.is_test_fixture && <TestFixtureBadge />}
      </div>
      <Heading className="display mt-4 text-2xl leading-tight">
        <Link href={`/products/${product.id}`} className="underline-offset-4 hover:underline">
          {product.name}
        </Link>
      </Heading>
      <p className="mt-1 text-sm text-brand-600">
        {[product.brand, product.size_label].filter(Boolean).join(" · ") || "Brand and size not provided"}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-brand-200/70 pt-4 text-sm">
        <div>
          <dt className="text-xs text-brand-500">Price</dt>
          <dd className={product.price_amount != null ? "font-semibold text-brand-900" : "text-brand-600"}>{price}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-brand-500">Availability</dt>
          <dd className={product.availability === "in_stock" ? "text-brand-900" : "text-brand-600"}>
            {AVAILABILITY_LABEL[product.availability] ?? product.availability}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-brand-500">
        Sold by {product.retailer.name}
        {product.retailer.city ? `, ${product.retailer.city}` : ""}
      </p>
      {children && <div className="mt-4 flex-1">{children}</div>}
    </article>
  );
}
