"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Spinner } from "@/components/ui/States";
import type { CatalogProduct } from "@/lib/catalog";
import { MAX_QUANTITY, WhatsAppLink, orderErrorMessage, orderRequestApi } from "@/lib/orderRequests";

/**
 * The two V1 ordering methods for a partner product (backend docs/ordering.md):
 * a website order request, and a WhatsApp message to the retailer's configured
 * number. Neither confirms or pays for an order.
 */
export function OrderOptions({ product }: { product: CatalogProduct }) {
  const [quantity, setQuantity] = useState(1);
  const [wa, setWa] = useState<WhatsAppLink | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const outOfStock = product.availability === "out_of_stock";
  const waConfigured = product.retailer.whatsapp_available;

  // The link is built by the backend from the stored listing, so the message
  // can't contain anything the customer or page altered.
  useEffect(() => {
    if (outOfStock || !waConfigured) return;
    let cancelled = false;
    setWa(null);
    setWaError(null);
    orderRequestApi
      .whatsapp([{ product_id: product.id, quantity }])
      .then((link) => !cancelled && setWa(link))
      .catch((err) => !cancelled && setWaError(orderErrorMessage(err, "We couldn’t prepare the WhatsApp message.")));
    return () => {
      cancelled = true;
    };
  }, [product.id, quantity, outOfStock, waConfigured]);

  if (outOfStock) {
    return (
      <section className="card mt-10 space-y-3" aria-labelledby="how-to-order">
        <h2 id="how-to-order" className="font-semibold text-brand-900">
          How to order
        </h2>
        <p className="text-sm text-brand-600">
          {product.retailer.name} lists this product as out of stock, so it can’t be requested right now.
        </p>
        <Link href="/recommendations" className="btn-secondary">
          Find other products for my skin
        </Link>
      </section>
    );
  }

  return (
    <section className="card mt-10 space-y-5" aria-labelledby="how-to-order">
      <h2 id="how-to-order" className="font-semibold text-brand-900">
        How to order
      </h2>
      <p className="text-sm leading-relaxed text-brand-600">
        Both options send a <strong>request</strong> to {product.retailer.name}. It isn’t a confirmed order until the
        retailer confirms availability and the final price. No payment is taken on this website.
      </p>

      <div>
        <label htmlFor="order-qty" className="text-xs text-brand-500">
          Quantity
        </label>
        <div className="mt-1 w-28">
          <select
            id="order-qty"
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          >
            {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-brand-900">Request on this website</h3>
          <p className="text-xs text-brand-500">
            Requires an account. You’ll get a reference and can follow its status under My requests.
          </p>
          <Link href={`/products/${product.id}/request?quantity=${quantity}`} className="btn-primary">
            Request this product
          </Link>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-brand-900">Order on WhatsApp</h3>
          {!waConfigured ? (
            <p className="text-xs text-brand-500">
              {product.retailer.name} hasn’t set up WhatsApp ordering yet. Use a website request instead.
            </p>
          ) : waError ? (
            <Alert tone="error">{waError}</Alert>
          ) : !wa ? (
            <Spinner label="Preparing WhatsApp message" />
          ) : wa.available && wa.url ? (
            <>
              <p className="text-xs text-brand-500">
                Opens WhatsApp with a message to {wa.retailer_name}. Nothing is sent until you press send, and the
                retailer will see your WhatsApp number.
              </p>
              <a href={wa.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Open WhatsApp
              </a>
              <details className="text-xs text-brand-600">
                <summary className="cursor-pointer">See the message</summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans">{wa.message}</pre>
              </details>
            </>
          ) : (
            <p className="text-xs text-brand-500">{wa.reason}</p>
          )}
        </div>
      </div>
    </section>
  );
}
