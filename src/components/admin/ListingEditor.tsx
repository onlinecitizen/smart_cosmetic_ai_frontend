"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { AdminCatalogProduct } from "@/lib/catalog";

/** Checks a price/stock edit before it is sent. Returns an error sentence, or null. */
export function listingError(price: string, currency: string): string | null {
  const p = price.trim();
  const c = currency.trim().toUpperCase();
  if (!p && !c) return null;
  if (!p) return "Enter a price, or clear the currency too.";
  if (!/^\d+$/.test(p)) return "Price must be a whole number, without commas or decimals.";
  if (Number(p) > 100_000_000) return "That price is too high.";
  if (!/^[A-Z]{3}$/.test(c)) return "Currency must be a 3-letter code, for example TZS.";
  return null;
}

/**
 * Price and stock for one product (PATCH /admin/catalog/products/{id}/listing).
 * Keeps the product's review status; every change is recorded in the audit log.
 */
export function ListingEditor({ product, onSaved }: { product: AdminCatalogProduct; onSaved: () => void }) {
  const [price, setPrice] = useState(product.price_amount != null ? String(product.price_amount) : "");
  const [currency, setCurrency] = useState(product.currency ?? "");
  const [availability, setAvailability] = useState(product.availability);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    price !== (product.price_amount != null ? String(product.price_amount) : "") ||
    currency.toUpperCase() !== (product.currency ?? "") ||
    availability !== product.availability;

  async function save() {
    const invalid = listingError(price, currency);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/v1/admin/catalog/products/${product.id}/listing`, {
        price_amount: price.trim() ? Number(price.trim()) : null,
        currency: currency.trim() ? currency.trim().toUpperCase() : null,
        availability,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Could not save the price and stock."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          aria-label={`Price for ${product.name}`}
          className="w-24 rounded-lg border border-brand-200 bg-white px-2 py-1"
          inputMode="numeric"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          aria-label={`Currency for ${product.name}`}
          className="w-14 rounded-lg border border-brand-200 bg-white px-2 py-1 uppercase"
          placeholder="TZS"
          maxLength={3}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
        <select
          aria-label={`Stock for ${product.name}`}
          className="rounded-lg border border-brand-200 bg-white px-2 py-1"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option value="in_stock">In stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="unknown">Not confirmed</option>
        </select>
        <button type="button" className="text-brand-700 underline" disabled={!dirty || busy} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
