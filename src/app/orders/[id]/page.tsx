"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { Bottle } from "@/components/Bottle";
import { PageLoader } from "@/components/PageLoader";
import { Alert, StatusBadge } from "@/components/ui/States";
import { api, errorMessage, Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CUSTOMER_CANCELLABLE, ORDER_TIMELINE, orderStatusInfo, timelineIndex } from "@/lib/orderStatus";
import { firstName, formatPrice } from "@/lib/product";

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

function OrderContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await api.get<Order>(`/api/v1/orders/${id}`));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "We couldn’t load this order."));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function act(path: "submit" | "cancel", failure: string) {
    // Cancelling cannot be undone (CANCELLED is a terminal status).
    if (path === "cancel" && !window.confirm("Cancel this order request? This can’t be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      setOrder(await api.post<Order>(`/api/v1/orders/${id}/${path}`));
    } catch (err) {
      setError(errorMessage(err, failure));
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return (
      <PageLoader
        message={loadError}
        onRetry={() => {
          setLoadError(null);
          load();
        }}
      />
    );
  }

  const info = orderStatusInfo(order.status);
  const isTerminal = ["CANCELLED", "FAILED"].includes(order.status);
  const stepIndex = timelineIndex(order.status);
  const name = firstName(user?.full_name);

  return (
    <div className="overflow-x-hidden">
      <section className="relative overflow-hidden bg-brand-900 text-brand-50">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(200,169,110,0.3)_0%,transparent_60%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.3fr] md:py-20">
          <div className="mx-auto hidden h-[400px] w-[230px] md:block">
            <Bottle name={name} code={order.formula_code} className="h-full w-full" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
              Order <span className="font-mono normal-case tracking-wider">{order.order_code}</span>
            </p>
            <h1 className="display mt-4 text-4xl !text-brand-50 sm:text-6xl">{info.label}</h1>
            <p className="mt-4 max-w-lg text-brand-300">{info.description}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-10">
        <div className="glass p-6 sm:p-8">
          <h2 className="eyebrow">Order details</h2>
          <dl className="mt-6 space-y-4 text-sm">
            {[
              ["Order number", <span key="o" className="font-mono">{order.order_code}</span>],
              ["Formula code", <span key="f" className="font-mono">{order.formula_code}</span>],
              ["Product", [order.product_name, order.size_label].filter(Boolean).join(" · ") || "—"],
              ["Quantity", order.quantity ?? "—"],
              ["Unit price", formatPrice(order.unit_price, order.currency)],
              ["Total", formatPrice(order.total_price, order.currency)],
              ["Payment", "Not taken online"],
              ["Status", <StatusBadge key="s" label={info.label} tone={info.tone} />],
              ["Placed", fmtDate(order.created_at)],
              ["Last updated", fmtDate(order.updated_at)],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between gap-4 border-b border-brand-200/70 pb-3">
                <dt className="text-brand-500">{k}</dt>
                <dd className="text-right text-brand-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          {!isTerminal && order.status !== "DRAFT" && (
            <>
              <h2 className="eyebrow">Progress</h2>
              <ol className="mt-6">
                {ORDER_TIMELINE.map((s, i) => {
                  const done = stepIndex >= i;
                  const current = stepIndex === i;
                  return (
                    <li key={s} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? "step" : undefined}>
                      {i < ORDER_TIMELINE.length - 1 && (
                        <span
                          className={`absolute left-[11px] top-6 h-full w-px ${stepIndex > i ? "bg-brand-900" : "bg-brand-200"}`}
                          aria-hidden
                        />
                      )}
                      <span
                        className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                          done ? "border-brand-900 bg-brand-900" : "border-brand-300 bg-brand-50"
                        }`}
                        aria-hidden
                      >
                        {current && <span className="h-2 w-2 animate-pulse rounded-full bg-gold-300" />}
                      </span>
                      <span className={`pt-0.5 text-sm ${done ? "text-brand-900" : "text-brand-500"} ${current ? "font-semibold" : ""}`}>
                        {orderStatusInfo(s).label}
                        <span className="sr-only">{current ? " (current)" : done ? " (done)" : " (not yet)"}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {error && (
            <Alert tone="error" className="mt-6">
              {error}
            </Alert>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {order.status === "DRAFT" && (
              <button className="btn-primary" onClick={() => act("submit", "We couldn’t send your request. Please try again.")} disabled={busy}>
                {busy ? "Sending..." : "Send order request"}
              </button>
            )}
            {CUSTOMER_CANCELLABLE.includes(order.status) && (
              <button className="btn-secondary" onClick={() => act("cancel", "We couldn’t cancel this order.")} disabled={busy}>
                Cancel order
              </button>
            )}
            {!isTerminal && (
              <button className="btn-secondary" onClick={refresh} disabled={refreshing || busy}>
                {refreshing ? "Refreshing..." : "Refresh status"}
              </button>
            )}
            <Link href="/orders" className="btn-secondary">
              All orders
            </Link>
          </div>
        </div>
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
