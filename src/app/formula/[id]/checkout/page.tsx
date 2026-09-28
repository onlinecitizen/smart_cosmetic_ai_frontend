"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Bottle } from "@/components/Bottle";
import { PageLoader } from "@/components/PageLoader";
import { api, Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFormula } from "@/lib/useFormula";
import { PRODUCT, UNIT_PRICE, firstName, formatPrice } from "@/lib/product";

function CheckoutContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { formula, error: loadError } = useFormula(id);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!formula) return <PageLoader message={loadError} />;

  if (formula.status !== "VALIDATED") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <p className="text-brand-600">This formula can’t be ordered.</p>
        <Link href={`/formula/${formula.id}`} className="btn-secondary mt-6">
          Back to formula
        </Link>
      </div>
    );
  }

  async function placeOrder() {
    if (!formula) return;
    setBusy(true);
    setError(null);
    let order: Order;
    try {
      order = await api.post<Order>("/api/v1/orders", { formula_id: formula.id, quantity });
    } catch {
      setError("We couldn’t place your order. Please try again.");
      setBusy(false);
      return;
    }
    try {
      // Orders are created as drafts; submitting confirms them.
      await api.post<Order>(`/api/v1/orders/${order.id}/submit`);
    } catch {
      // The draft exists; the order page offers to submit it again.
    }
    router.push(`/orders/${order.id}`);
  }

  const name = firstName(user?.full_name);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <Link href={`/formula/${formula.id}`} className="text-xs uppercase tracking-[0.2em] text-brand-500 hover:text-brand-900">
        ← Back to formula
      </Link>
      <h1 className="display mt-6 text-5xl">Your order</h1>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="card flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="mx-auto h-44 w-24 shrink-0 sm:mx-0">
              <Bottle name={name} code={formula.formula_code} float={false} className="h-full w-full" />
            </div>
            <div className="flex-1">
              <p className="eyebrow">Product</p>
              <h2 className="display mt-2 text-3xl">{PRODUCT.name}</h2>
              <p className="mt-1 text-sm text-brand-500">
                {PRODUCT.sizeLabel} · <span className="font-mono">{formula.formula_code}</span>
                {name && ` · labelled for ${name}`}
              </p>
            </div>
            <div>
              <p className="label">Quantity</p>
              <div className="flex items-center rounded-full border border-brand-200 bg-white">
                <button
                  className="grid h-10 w-10 place-items-center text-lg text-brand-700 disabled:opacity-30"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || busy}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold" aria-live="polite">
                  {quantity}
                </span>
                <button
                  className="grid h-10 w-10 place-items-center text-lg text-brand-700 disabled:opacity-30"
                  onClick={() => setQuantity((q) => Math.min(PRODUCT.maxQuantity, q + 1))}
                  disabled={quantity >= PRODUCT.maxQuantity || busy}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="eyebrow">Delivery</p>
            <p className="mt-3 text-sm leading-relaxed text-brand-600">
              Delivery is arranged after your serum has been made. Order updates are linked to your account,{" "}
              <strong>{user?.email}</strong>.
            </p>
          </div>
        </div>

        <aside className="glass h-fit p-8">
          <p className="eyebrow">Order summary</p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between text-brand-600">
              <dt>Personalized formulation × {quantity}</dt>
              <dd>{formatPrice(PRODUCT.formulationPrice * quantity)}</dd>
            </div>
            <div className="flex justify-between text-brand-600">
              <dt>Personalized packaging × {quantity}</dt>
              <dd>{formatPrice(PRODUCT.packagingPrice * quantity)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-brand-200 pt-4">
              <dt className="font-semibold text-brand-900">Total</dt>
              <dd className="display text-3xl">{formatPrice(UNIT_PRICE * quantity)}</dd>
            </div>
          </dl>
          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          <button className="btn-primary mt-8 w-full" onClick={placeOrder} disabled={busy}>
            {busy ? "Placing your order..." : "Order my personalized formula"}
          </button>
          <p className="mt-4 text-center text-xs text-brand-400">No payment is taken online.</p>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}
