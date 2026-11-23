"use client";

import { useState } from "react";
import { ListingEditor, listingError } from "@/components/admin/ListingEditor";
import { adminCatalogApi, adminError, AdminIdentity, AdminListing, Readiness } from "@/lib/adminCatalog";
import type { AdminRetailer } from "@/lib/catalog";
import { formatPrice } from "@/lib/product";
import { ConfirmRequest } from "./ConfirmDialog";
import { CatalogStatus, formatWhen, ReadinessList } from "./shared";

function AddListing({
  identity,
  retailers,
  onDone,
}: {
  identity: AdminIdentity;
  retailers: AdminRetailer[];
  onDone: () => void;
}) {
  const [retailerId, setRetailerId] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [availability, setAvailability] = useState("unknown");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!retailerId || !sku.trim()) return setError("Choose the shop and enter its product code (SKU).");
    const invalid = listingError(price, currency);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    try {
      await adminCatalogApi.createListing({
        retailer_id: retailerId,
        identity_id: identity.id,
        sku: sku.trim(),
        // The product facts come from the shared product; these satisfy the payload shape only.
        name: identity.name,
        category: identity.category_code,
        price_amount: price.trim() ? Number(price.trim()) : null,
        currency: currency.trim() ? currency.trim().toUpperCase() : null,
        availability,
      });
      setRetailerId("");
      setSku("");
      setPrice("");
      setCurrency("");
      setAvailability("unknown");
      onDone();
    } catch (err) {
      setError(adminError(err, "Could not add the shop listing."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={add} className="card space-y-3" aria-label="Add a shop listing">
      <h3 className="font-semibold text-brand-900">Sold by another shop</h3>
      <p className="text-xs text-brand-500">
        Adds this exact product to a shop’s catalogue with that shop’s own code, price and stock. The product facts stay
        shared.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">Shop *</span>
          <select className="input" value={retailerId} onChange={(e) => setRetailerId(e.target.value)}>
            <option value="">Choose…</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="label">Shop’s product code (SKU) *</span>
          <input className="input" value={sku} maxLength={64} onChange={(e) => setSku(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="label">Price (whole number)</span>
          <input className="input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="label">Currency</span>
          <input className="input uppercase" maxLength={3} placeholder="TZS" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="label">Availability</span>
          <select className="input" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="unknown">Not confirmed</option>
            <option value="in_stock">In stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Adding…" : "Add shop listing"}
      </button>
    </form>
  );
}

export function ListingsPanel({
  identity,
  listings,
  retailers,
  onChanged,
  confirm,
}: {
  identity: AdminIdentity;
  listings: AdminListing[];
  retailers: AdminRetailer[];
  onChanged: () => void;
  confirm: (r: ConfirmRequest) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Record<string, Readiness>>({});
  const locked = identity.status === "ARCHIVED";
  const used = new Set(listings.map((l) => l.retailer_id));

  async function publish(l: AdminListing) {
    setError(null);
    try {
      setReadiness((r) => {
        const next = { ...r };
        delete next[l.id];
        return next;
      });
      const check = await adminCatalogApi.listingReadiness(l.id);
      if (!check.can_publish) {
        setReadiness((r) => ({ ...r, [l.id]: check }));
        return;
      }
    } catch (err) {
      setError(adminError(err, "Could not check the listing."));
      return;
    }
    confirm({
      title: `Publish at ${l.retailer.name}?`,
      body:
        identity.status === "PUBLISHED"
          ? "Customers will see this shop’s offer straight away."
          : "This also publishes the product itself, recording you as its reviewer. Only publish after checking its details against the real label or the brand’s data.",
      confirmLabel: "Publish",
      onConfirm: async () => {
        try {
          await adminCatalogApi.listingAction(l.id, "publish");
        } catch (err) {
          throw new Error(adminError(err, "Could not publish the listing."));
        }
        onChanged();
      },
    });
  }

  function archive(l: AdminListing) {
    confirm({
      title: `Stop selling at ${l.retailer.name}?`,
      body: "The listing is archived and disappears from the shop at once. Order requests already made are kept. You can restore it later; it then needs publishing again.",
      confirmLabel: "Archive listing",
      danger: true,
      onConfirm: async () => {
        try {
          await adminCatalogApi.listingAction(l.id, "archive");
        } catch (err) {
          throw new Error(adminError(err, "Could not archive the listing."));
        }
        onChanged();
      },
    });
  }

  async function restore(l: AdminListing) {
    setError(null);
    try {
      await adminCatalogApi.listingAction(l.id, "restore");
      onChanged();
    } catch (err) {
      setError(adminError(err, "Could not restore the listing."));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-600">
        Each shop’s code, price and stock belong to that shop. Changing them doesn’t change the product facts and doesn’t
        need a new review; every change is recorded with its old and new value.
      </p>
      {listings.length === 0 ? (
        <p className="text-sm text-brand-600">No shop sells this product yet, so customers can’t see it.</p>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="card space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-brand-900">
                  {l.retailer.name}
                  {!retailers.find((r) => r.id === l.retailer_id)?.is_active && (
                    <span className="ml-2 text-xs text-amber-900">shop inactive</span>
                  )}
                  <span className="ml-2 font-mono text-xs text-brand-500">{l.sku}</span>
                </p>
                <CatalogStatus status={l.status} />
              </div>
              <p className="text-xs text-brand-600">
                {l.price_amount != null ? formatPrice(l.price_amount, l.currency) : "No price"} · price confirmed{" "}
                {formatWhen(l.price_confirmed_at)} · stock confirmed {formatWhen(l.stock_confirmed_at)}
              </p>
              {l.status !== "ARCHIVED" && <ListingEditor key={`${l.id}-${l.updated_at}`} product={l} onSaved={onChanged} />}
              {readiness[l.id] && <ReadinessList readiness={readiness[l.id]} />}
              <div className="flex flex-wrap gap-3 text-xs">
                {l.status !== "PUBLISHED" && l.status !== "ARCHIVED" && !locked && (
                  <button type="button" className="text-brand-700 underline" onClick={() => publish(l)}>
                    Publish at this shop
                  </button>
                )}
                {l.status === "PUBLISHED" && identity.status !== "PUBLISHED" && (
                  <span className="text-amber-900">Hidden until the product itself is published again.</span>
                )}
                {l.status !== "ARCHIVED" && (
                  <button type="button" className="text-red-700 underline" onClick={() => archive(l)}>
                    Archive listing
                  </button>
                )}
                {l.status === "ARCHIVED" && (
                  <button type="button" className="text-brand-700 underline" onClick={() => restore(l)}>
                    Restore listing
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!locked && <AddListing identity={identity} retailers={retailers.filter((r) => !used.has(r.id))} onDone={onChanged} />}
    </div>
  );
}
