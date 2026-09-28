"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Reveal } from "@/components/Reveal";
import { Bottle } from "@/components/Bottle";
import { PageLoader } from "@/components/PageLoader";
import { api, Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFormula } from "@/lib/useFormula";
import { ORDER_STATUS_LABEL, ORDER_TIMELINE, PRODUCT, UNIT_PRICE, firstName, formatPrice } from "@/lib/product";

function headlineFor(status: string): { eyebrow: string; title: string; body: string } {
  if (status === "DRAFT")
    return {
      eyebrow: "Almost there",
      title: "Your order is saved",
      body: "Confirm it below and we’ll start preparing your serum.",
    };
  if (status === "CANCELLED")
    return { eyebrow: "Order cancelled", title: "This order was cancelled", body: "You can start a new assessment any time." };
  if (status === "FAILED")
    return {
      eyebrow: "We’re sorry",
      title: "This order couldn’t be completed",
      body: "Something went wrong while making it. Please start a new order.",
    };
  if (status === "COMPLETED")
    return { eyebrow: "Delivered", title: "Enjoy your formula", body: "Your personalized serum has been delivered." };
  return {
    eyebrow: "Your formula is ready",
    title: "Your order has been received",
    body: "Your personalized serum will now be prepared. Its progress is shown below.",
  };
}

function OrderContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formula } = useFormula(order?.formula_id);

  const load = useCallback(() => {
    api
      .get<Order>(`/api/v1/orders/${id}`)
      .then(setOrder)
      .catch(() => setLoadError("We couldn’t load this order."));
  }, [id]);

  useEffect(load, [load]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post<Order>(`/api/v1/orders/${id}/submit`);
      load();
    } catch {
      setError("Could not confirm the order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api.post<Order>(`/api/v1/orders/${id}/cancel`);
      load();
    } catch {
      setError("Could not cancel the order.");
    } finally {
      setBusy(false);
    }
  }

  if (!order) return <PageLoader message={loadError} />;

  const quantity = order.items?.[0]?.quantity ?? 1;
  const headline = headlineFor(order.status);
  const isTerminal = ["CANCELLED", "FAILED"].includes(order.status);
  const timelineIndex = ORDER_TIMELINE.indexOf(order.status);
  const name = firstName(user?.full_name);

  return (
    <div className="overflow-x-hidden">
      <section className="relative overflow-hidden bg-brand-900 text-brand-50">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(200,169,110,0.3)_0%,transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.3fr] md:py-24">
          <div className="mx-auto h-[360px] w-[210px] sm:h-[440px] sm:w-[250px]">
            <Bottle name={name} code={formula?.formula_code} className="h-full w-full" />
          </div>
          <div className="text-center md:text-left">
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">{headline.eyebrow}</p>
              <h1 className="display mt-4 text-5xl !text-brand-50 sm:text-6xl">{headline.title}</h1>
              <p className="mt-4 text-brand-300">{headline.body}</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <div className="glass p-8">
            <p className="eyebrow">Order details</p>
            <dl className="mt-6 space-y-4 text-sm">
              {[
                ["Order number", <span key="o" className="font-mono">{order.order_code}</span>],
                ["Formula code", <span key="f" className="font-mono">{formula?.formula_code ?? "…"}</span>],
                ["Product", `${PRODUCT.name} · ${PRODUCT.sizeLabel}`],
                ["Quantity", quantity],
                ["Price", formatPrice(UNIT_PRICE * quantity)],
                ["Status", ORDER_STATUS_LABEL[order.status] ?? order.status],
                ["Placed", new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4 border-b border-brand-200/70 pb-3">
                  <dt className="text-brand-500">{k}</dt>
                  <dd className="text-right text-brand-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div>
            {!isTerminal && order.status !== "DRAFT" && (
              <>
                <p className="eyebrow">Progress</p>
                <ol className="mt-6 space-y-0">
                  {ORDER_TIMELINE.map((s, i) => {
                    const done = timelineIndex >= i;
                    const current = timelineIndex === i;
                    return (
                      <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
                        {i < ORDER_TIMELINE.length - 1 && (
                          <span
                            className={`absolute left-[11px] top-6 h-full w-px ${done && timelineIndex > i ? "bg-brand-900" : "bg-brand-200"}`}
                            aria-hidden
                          />
                        )}
                        <span
                          className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                            done ? "border-brand-900 bg-brand-900" : "border-brand-300 bg-brand-50"
                          }`}
                        >
                          {current && <span className="h-2 w-2 animate-pulse rounded-full bg-gold-300" />}
                        </span>
                        <span className={`pt-0.5 text-sm ${done ? "text-brand-900" : "text-brand-400"} ${current ? "font-semibold" : ""}`}>
                          {ORDER_STATUS_LABEL[s]}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {error && <p className="mt-6 text-sm text-red-700">{error}</p>}

            <div className="mt-8 flex flex-wrap gap-3">
              {order.status === "DRAFT" && (
                <button className="btn-primary" onClick={submit} disabled={busy}>
                  Confirm order
                </button>
              )}
              {["DRAFT", "SUBMITTED", "VALIDATED"].includes(order.status) && (
                <button className="btn-secondary" onClick={cancel} disabled={busy}>
                  Cancel order
                </button>
              )}
              <Link href="/orders" className="btn-secondary">
                All orders
              </Link>
            </div>
            <p className="mt-8 text-xs leading-relaxed text-brand-400">
              Status updates automatically as the laboratory reports progress. No payment is taken online.
            </p>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderContent />
    </RequireAuth>
  );
}
