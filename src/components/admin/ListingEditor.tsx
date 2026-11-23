"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { adminError } from "@/lib/adminCatalog";
import { AdminCatalogProduct } from "@/lib/catalog";

/** Checks a price/stock edit before it is sent. Returns an error sentence, or null. */
export function listingError(price: string, currency: string, stock = ""): string | null {
  const p = price.trim();
  const c = currency.trim().toUpperCase();
  const s = stock.trim();
  if (s && !/^\d+$/.test(s)) return "Units in stock must be a whole number, or empty if unknown.";
  if (!p && !c) return null;
  if (!p) return "Enter a price, or clear the currency too.";
  if (!/^\d+$/.test(p)) return "Price must be a whole number, without commas or decimals.";
  if (Number(p) > 100_000_000) return "That price is too high.";
  if (!/^[A-Z]{3}$/.test(c)) return "Currency must be a 3-letter code, for example TZS.";
  return null;
}

type Listing = AdminCatalogProduct & { stock_quantity?: number | null };

/**
 * Price and stock for one shop's listing (PATCH /admin/catalog/products/{id}/listing).
 * This is shop data, separate from the product's facts: it keeps the review
 * status, and every change is audited with its old and new value. The editor
 * sends the version it loaded, so a change made meanwhile by someone else is
 * refused instead of being overwritten.
 */
export function ListingEditor({ product, onSaved }: { product: Listing; onSaved: () => void }) {
  const original = {
    price: product.price_amount != null ? String(product.price_amount) : "",
    currency: product.currency ?? "",
    availability: product.availability,
    stock: product.stock_quantity != null ? String(product.stock_quantity) : "",
  };
  const [price, setPrice] = useState(original.price);
  const [currency, setCurrency] = useState(original.currency);
  const [availability, setAvailability] = useState(original.availability);
  const [stock, setStock] = useState(original.stock);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stockChanged = stock.trim() !== original.stock;
  const dirty =
    price !== original.price ||
    currency.toUpperCase() !== original.currency ||
    availability !== original.availability ||
    stockChanged;

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/v1/admin/catalog/products/${product.id}/listing`, {
        ...body,
        expected_updated_at: product.updated_at,
      });
      onSaved();
    } catch (err) {
      setError(adminError(err, "Could not save the price and stock."));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const invalid = listingError(price, currency, stock);
    if (invalid) {
      setError(invalid);
      return;
    }
    const body: Record<string, unknown> = {
      price_amount: price.trim() ? Number(price.trim()) : null,
      currency: currency.trim() ? currency.trim().toUpperCase() : null,
      availability,
    };
    if (stockChanged) body.stock_quantity = stock.trim() ? Number(stock.trim()) : null;
    send(body);
  }

  /** The shop says nothing changed: record the confirmation time. */
  function confirmUnchanged() {
    send({
      price_amount: product.price_amount,
      currency: product.currency,
      availability: product.availability,
      stock_quantity: product.stock_quantity ?? null,
    });
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
        <input
          aria-label={`Units in stock for ${product.name}`}
          className="w-20 rounded-lg border border-brand-200 bg-white px-2 py-1"
          inputMode="numeric"
          placeholder="Units"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        <button type="button" className="text-brand-700 underline" disabled={!dirty || busy} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
        {!dirty && (
          <button type="button" className="text-brand-600 underline" disabled={busy} onClick={confirmUnchanged}>
            Shop confirmed unchanged
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
