"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatIcon } from "@/components/ui/Icons";
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
      <section className="mt-5 space-y-3 rounded-2xl bg-peach-50 p-4" aria-labelledby="how-to-order">
        <h2 id="how-to-order" className="text-sm font-semibold text-brand-900">
          How to order
        </h2>
        <p className="text-sm text-brand-600">
          {product.retailer.name} lists this product as out of stock, so it can’t be requested right now.
        </p>
        <Link href="/recommendations" className="btn-secondary w-full">
          Find other products for my skin
        </Link>
      </section>
    );
  }

  const waReady = waConfigured && !waError && wa?.available && wa.url;
  const requestLink = (
    <Link
      href={`/products/${product.id}/request?quantity=${quantity}`}
      className={waReady ? "btn-secondary w-full !py-3.5" : "btn-studio w-full !py-4 !text-[13px]"}
    >
      Request this product
    </Link>
  );

  return (
    <section className="mt-5 space-y-3" aria-labelledby="how-to-order">
      <div className="flex items-center justify-between gap-3">
        <h2 id="how-to-order" className="text-sm font-semibold text-brand-900">
          How to order
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="order-qty" className="text-xs text-brand-500">
            Quantity
          </label>
          <select
            id="order-qty"
            className="rounded-full border border-peach-200 bg-peach-50 px-3 py-1.5 text-sm text-brand-900"
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

      {waConfigured && !waError && !wa && <Spinner label="Preparing WhatsApp message" />}
      {waReady && (
        <a
          href={wa.url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-studio w-full !py-4 !text-[13px]"
        >
          <ChatIcon />
          Order via WhatsApp
        </a>
      )}
      {requestLink}

      <div className="space-y-1.5 text-xs leading-relaxed text-brand-500">
        <p>
          {waReady ? "Both options send" : "This sends"} a <strong>request</strong> to {product.retailer.name}. It isn’t a confirmed order until the
          retailer confirms availability and the final price. No payment is taken on this website.
        </p>
        <p>A website request needs an account; follow its status under My requests.</p>
        {!waConfigured ? (
          <p>{product.retailer.name} hasn’t set up WhatsApp ordering yet. Use a website request instead.</p>
        ) : waError ? (
          <Alert tone="error">{waError}</Alert>
        ) : wa && wa.available && wa.url ? (
          <>
            <p>
              WhatsApp opens with a message to {wa.retailer_name}. Nothing is sent until you press send, and the
              retailer will see your WhatsApp number.
            </p>
            <details className="text-brand-600">
              <summary className="cursor-pointer">See the message</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans">{wa.message}</pre>
            </details>
          </>
        ) : wa ? (
          <p>{wa.reason}</p>
        ) : null}
      </div>
    </section>
  );
}
