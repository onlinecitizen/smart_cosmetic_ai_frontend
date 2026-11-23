"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IdentityForm } from "@/components/admin/catalogue/IdentityForm";
import { CatalogueNav, useUnsavedChangesWarning } from "@/components/admin/catalogue/shared";
import { listingError } from "@/components/admin/ListingEditor";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import {
  adminCatalogApi,
  adminError,
  Duplicate,
  duplicatesFrom,
  EMPTY_FIELDS,
  IdentityFields,
  STATUS_LABEL,
} from "@/lib/adminCatalog";
import type { AdminRetailer } from "@/lib/catalog";
import { useAdminFormOptions } from "@/lib/useAdminFormOptions";

const REASON: Record<string, string> = {
  gtin: "same barcode",
  manufacturer_code: "same brand and manufacturer code",
  same_attributes: "same brand, name, variant and size",
  similar_name: "similar name",
};

function NewProduct() {
  const router = useRouter();
  const { options, error: optionsError, reload } = useAdminFormOptions();
  const [retailers, setRetailers] = useState<AdminRetailer[]>([]);
  const [shop, setShop] = useState({ retailer_id: "", sku: "", price: "", currency: "", availability: "unknown" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [pending, setPending] = useState<IdentityFields | null>(null);
  useUnsavedChangesWarning(dirty && !busy);

  useEffect(() => {
    adminCatalogApi.retailers().then(setRetailers).catch(() => setRetailers([]));
  }, []);

  async function create(fields: IdentityFields, allowSimilar: boolean) {
    const wantsShop = Boolean(shop.retailer_id);
    if (wantsShop) {
      if (!shop.sku.trim()) return setError("Enter the shop’s product code (SKU), or leave the shop empty.");
      const invalid = listingError(shop.price, shop.currency);
      if (invalid) return setError(invalid);
    }
    setBusy(true);
    setError(null);
    try {
      if (!allowSimilar) {
        const found = await adminCatalogApi.duplicates({
          name: fields.name,
          brand: fields.brand,
          variant: fields.variant,
          size_label: fields.size_label,
          gtin: fields.gtin,
          manufacturer_code: fields.manufacturer_code,
        });
        if (found.length) {
          setDuplicates(found);
          setPending(fields);
          return;
        }
      }
      const identity = await adminCatalogApi.createIdentity({ ...fields, allow_similar: allowSimilar });
      if (wantsShop) {
        try {
          await adminCatalogApi.createListing({
            retailer_id: shop.retailer_id,
            identity_id: identity.id,
            sku: shop.sku.trim(),
            name: identity.name,
            category: identity.category_code,
            price_amount: shop.price.trim() ? Number(shop.price.trim()) : null,
            currency: shop.currency.trim() ? shop.currency.trim().toUpperCase() : null,
            availability: shop.availability,
          });
        } catch (err) {
          // The product exists; say so plainly and send the admin to it.
          setDirty(false);
          router.push(`/admin/catalogue/${identity.id}?tab=shops&notice=${encodeURIComponent(adminError(err, "The shop listing could not be added."))}`);
          return;
        }
      }
      setDirty(false);
      router.push(`/admin/catalogue/${identity.id}`);
    } catch (err) {
      const dups = duplicatesFrom(err);
      if (dups.length) {
        setDuplicates(dups);
        setPending(fields);
      }
      setError(adminError(err, "The product could not be created."));
    } finally {
      setBusy(false);
    }
  }

  if (optionsError) return <ErrorState message={optionsError} onRetry={reload} />;
  if (!options) return <Spinner label="Loading" />;

  const blockingGtin = duplicates.some((d) => d.reason === "gtin");

  return (
    <div className="container-page space-y-6">
      <h1 className="display text-4xl">New product</h1>
      <CatalogueNav />

      {duplicates.length > 0 && (
        <section className="alert alert-warning space-y-2 text-sm" aria-label="Possible duplicates">
          <p className="font-semibold">This may already be in the catalogue:</p>
          <ul className="ml-5 list-disc">
            {duplicates.map((d) => (
              <li key={d.identity_id}>
                <Link href={`/admin/catalogue/${d.identity_id}`} className="underline" target="_blank">
                  {[d.brand, d.name, d.variant, d.size_label].filter(Boolean).join(" · ")}
                </Link>{" "}
                ({REASON[d.reason] ?? d.reason}, {STATUS_LABEL[d.status] ?? d.status})
              </li>
            ))}
          </ul>
          {blockingGtin ? (
            <p>A barcode belongs to one product only. Open the existing product and add this shop to it instead.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <p>If it’s the same product, open it and add the shop there instead of creating a copy.</p>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || !pending}
                onClick={() => pending && create(pending, true)}
              >
                It’s a different product — create it anyway
              </button>
            </div>
          )}
        </section>
      )}

      <IdentityForm
        initial={EMPTY_FIELDS}
        options={options}
        mode="create"
        submitLabel="Create draft product"
        busy={busy}
        serverError={error}
        onDirtyChange={setDirty}
        onSubmit={(_changes, all) => {
          setDuplicates([]);
          create(all, false);
        }}
        beforeSubmit={
          <section className="card space-y-3" aria-label="First shop listing (optional)">
            <h2 className="font-semibold text-brand-900">First shop (optional)</h2>
            <p className="text-xs text-brand-500">
              Price and stock belong to the shop, not the product. You can add more shops on the product page.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="label">Shop</span>
                <select className="input" value={shop.retailer_id} onChange={(e) => setShop({ ...shop, retailer_id: e.target.value })}>
                  <option value="">None yet</option>
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.is_active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="label">Shop’s product code (SKU)</span>
                <input className="input" maxLength={64} value={shop.sku} onChange={(e) => setShop({ ...shop, sku: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="label">Price (whole number)</span>
                <input className="input" inputMode="numeric" value={shop.price} onChange={(e) => setShop({ ...shop, price: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="label">Currency</span>
                <input className="input uppercase" maxLength={3} placeholder="TZS" value={shop.currency} onChange={(e) => setShop({ ...shop, currency: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="label">Availability</span>
                <select className="input" value={shop.availability} onChange={(e) => setShop({ ...shop, availability: e.target.value })}>
                  <option value="unknown">Not confirmed</option>
                  <option value="in_stock">In stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </label>
            </div>
          </section>
        }
      />

    </div>
  );
}

export default function NewProductPage() {
  return (
    <RequireAuth adminOnly>
      <NewProduct />
    </RequireAuth>
  );
}
