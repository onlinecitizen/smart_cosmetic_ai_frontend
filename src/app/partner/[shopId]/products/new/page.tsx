"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IdentityForm } from "@/components/admin/catalogue/IdentityForm";
import { useUnsavedChangesWarning } from "@/components/admin/catalogue/shared";
import { listingError } from "@/components/admin/ListingEditor";
import { PartnerNav } from "@/components/partner/PartnerNav";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState, Spinner } from "@/components/ui/States";
import { ApiError } from "@/lib/api";
import { adminError, EMPTY_FIELDS, IdentityFields } from "@/lib/adminCatalog";
import { CatalogProduct, catalogApi } from "@/lib/catalog";
import { makeShopApi } from "@/lib/partner";
import { useAdminFormOptions } from "@/lib/useAdminFormOptions";

interface ShopFields {
  sku: string;
  price: string;
  currency: string;
  availability: string;
  stock: string;
}

function ListingFields({ value, onChange, required }: { value: ShopFields; onChange: (v: ShopFields) => void; required: boolean }) {
  return (
    <section className="card grid gap-3 sm:grid-cols-2" aria-label="Your shop's listing">
      <h2 className="font-semibold text-brand-900 sm:col-span-2">Your shop’s listing{required ? "" : " (optional)"}</h2>
      <p className="text-xs text-brand-500 sm:col-span-2">Your own code, price and stock. Prices are whole amounts with a 3-letter currency.</p>
      <label className="block text-sm">
        <span className="label">Your product code (SKU){required ? " *" : ""}</span>
        <input className="input" maxLength={64} value={value.sku} onChange={(e) => onChange({ ...value, sku: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="label">Price (whole amount)</span>
        <input className="input" inputMode="numeric" value={value.price} onChange={(e) => onChange({ ...value, price: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="label">Currency</span>
        <input className="input uppercase" maxLength={3} placeholder="TZS" value={value.currency} onChange={(e) => onChange({ ...value, currency: e.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="label">Availability</span>
        <select className="input" value={value.availability} onChange={(e) => onChange({ ...value, availability: e.target.value })}>
          <option value="unknown">Not confirmed</option>
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="label">Units in stock</span>
        <input className="input" inputMode="numeric" value={value.stock} onChange={(e) => onChange({ ...value, stock: e.target.value })} />
      </label>
    </section>
  );
}

function listingPayload(v: ShopFields): Record<string, unknown> | string {
  if (!v.sku.trim() && !v.price.trim() && !v.stock.trim()) return {};
  const invalid = listingError(v.price, v.currency, v.stock);
  if (invalid) return invalid;
  if (!v.sku.trim()) return "Enter your product code (SKU) to add your listing, or clear the price and stock.";
  return {
    sku: v.sku.trim(),
    price_amount: v.price.trim() ? Number(v.price.trim()) : null,
    currency: v.currency.trim() ? v.currency.trim().toUpperCase() : null,
    availability: v.availability,
    stock_quantity: v.stock.trim() ? Number(v.stock.trim()) : null,
  };
}

function NewProduct() {
  const { shopId } = useParams<{ shopId: string }>();
  const router = useRouter();
  const shopApi = useMemo(() => makeShopApi(shopId), [shopId]);
  const { options, error: optionsError, reload } = useAdminFormOptions(shopApi.formOptions);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [shop, setShop] = useState<ShopFields>({ sku: "", price: "", currency: "", availability: "unknown", stock: "" });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<{ identity_id: string; name: string; brand: string | null }[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogProduct[] | null>(null);
  const [picked, setPicked] = useState<CatalogProduct | null>(null);
  useUnsavedChangesWarning(dirty && !busy);

  async function createNew(fields: IdentityFields) {
    const listing = listingPayload(shop);
    if (typeof listing === "string") return setError(listing);
    setBusy(true);
    setError(null);
    setDuplicates([]);
    try {
      const created = await shopApi.create({ ...fields, ...listing });
      setDirty(false);
      router.push(`/partner/${shopId}/products/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && typeof err.detail === "object" && err.detail && "duplicates" in err.detail) {
        setDuplicates((err.detail as { duplicates: typeof duplicates }).duplicates);
      }
      setError(adminError(err, "The product could not be created."));
      setBusy(false);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setResults((await catalogApi.list({ q: query.trim(), limit: 20 })).items);
    } catch (err) {
      setError(adminError(err, "Search failed."));
    }
  }

  async function sellExisting() {
    if (!picked) return;
    const listing = listingPayload(shop);
    if (typeof listing === "string") return setError(listing);
    if (!("sku" in listing)) return setError("Enter your product code (SKU).");
    setBusy(true);
    setError(null);
    try {
      const created = await shopApi.create({ identity_id: (picked as CatalogProduct & { identity_id: string }).identity_id, ...listing });
      router.push(`/partner/${shopId}/products/${created.id}`);
    } catch (err) {
      setError(adminError(err, "Could not add your listing."));
      setBusy(false);
    }
  }

  if (optionsError) return <ErrorState message={optionsError} onRetry={reload} />;
  if (!options) return <Spinner label="Loading" />;

  return (
    <div className="container-page space-y-6">
      <PartnerNav shopId={shopId} />
      <h1 className="display text-4xl">Add a product</h1>
      <div role="radiogroup" aria-label="What are you adding?" className="flex flex-wrap gap-2">
        <button type="button" role="radio" aria-checked={mode === "new"} className={mode === "new" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("new")}>
          A product not yet on Smart Cosmetic AI
        </button>
        <button type="button" role="radio" aria-checked={mode === "existing"} className={mode === "existing" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("existing")}>
          Sell an existing product
        </button>
      </div>
      {error && (
        <div role="alert" className="alert alert-error text-sm">
          <p>{error}</p>
          {duplicates.length > 0 && (
            <ul className="ml-5 mt-1 list-disc">
              {duplicates.map((d) => (
                <li key={d.identity_id}>
                  {[d.brand, d.name].filter(Boolean).join(" ")}{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      setMode("existing");
                      setPicked({ identity_id: d.identity_id, name: d.name, brand: d.brand } as unknown as CatalogProduct);
                    }}
                  >
                    Sell this one instead
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "new" ? (
        <IdentityForm
          initial={EMPTY_FIELDS}
          options={options}
          mode="create"
          submitLabel="Save as draft"
          busy={busy}
          onDirtyChange={setDirty}
          onSubmit={(_c, all) => createNew(all)}
          beforeSubmit={<ListingFields value={shop} onChange={setShop} required={false} />}
        />
      ) : (
        <div className="space-y-4">
          <form onSubmit={search} className="card flex flex-wrap items-end gap-3" role="search">
            <label className="block flex-1 text-sm">
              <span className="label">Find the product in the public catalogue</span>
              <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, brand or barcode" />
            </label>
            <button type="submit" className="btn-secondary">
              Search
            </button>
          </form>
          {results && (
            <ul className="space-y-2">
              {results.length === 0 && <li className="text-sm text-brand-600">Nothing found. Add it as a new product instead.</li>}
              {results.map((r) => (
                <li key={r.id}>
                  <label className="card flex items-center gap-2 text-sm">
                    <input type="radio" name="pick" checked={picked?.id === r.id} onChange={() => setPicked(r)} />
                    {[r.brand, r.name, r.size_label].filter(Boolean).join(" · ")}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <>
              <p className="text-sm">
                Selling: <strong>{[picked.brand, picked.name].filter(Boolean).join(" ")}</strong>. The product details stay managed by the
                platform; you can propose changes from the product page.
              </p>
              <ListingFields value={shop} onChange={setShop} required />
              <button type="button" className="btn-primary" disabled={busy} onClick={sellExisting}>
                {busy ? "Adding…" : "Add my listing"}
              </button>
              <p className="text-xs text-brand-500">Your listing is checked by the team before customers see it.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewPartnerProductPage() {
  return (
    <RequireAuth>
      <NewProduct />
    </RequireAuth>
  );
}
