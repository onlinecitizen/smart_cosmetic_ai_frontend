"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState, ErrorState, Spinner, StatusBadge } from "@/components/ui/States";
import { api, errorMessage, Order } from "@/lib/api";
import { orderStatusInfo } from "@/lib/orderStatus";
import { formatPrice } from "@/lib/product";

function OrdersContent() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setOrders(null);
    api
      .get<Order[]>("/api/v1/orders")
      .then(setOrders)
      .catch((err) => setError(errorMessage(err, "We couldn’t load your orders.")));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">Your account</p>
      <h1 className="display mt-4 text-4xl sm:text-5xl">Orders</h1>
      <div className="mt-10">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : orders === null ? (
          <Spinner label="Loading your orders" />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            body="Orders appear here after you review a formula and send an order request."
            action={{ href: "/analyze", label: "Start an assessment" }}
          />
        ) : (
          <ul className="divide-y divide-brand-200/70 border-y border-brand-200/70">
            {orders.map((o) => {
              const info = orderStatusInfo(o.status);
              return (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex flex-col gap-3 py-5 transition hover:bg-white/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-mono tracking-wider text-brand-900">{o.order_code}</p>
                      <p className="mt-1 text-sm text-brand-500">
                        {new Date(o.created_at).toLocaleDateString()} · {formatPrice(o.total_price, o.currency)}
                      </p>
                    </div>
                    <StatusBadge label={info.label} tone={info.tone} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}
