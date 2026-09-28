"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { api, Order } from "@/lib/api";
import { ORDER_STATUS_LABEL } from "@/lib/product";

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>("/api/v1/orders")
      .then(setOrders)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
      <p className="eyebrow">Your account</p>
      <h1 className="display mt-4 text-5xl">Orders</h1>
      <div className="mt-10">
        {loading ? (
          <p className="text-sm text-brand-400">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="card space-y-4 text-sm text-brand-500">
            <p>No orders yet.</p>
            <Link href="/analyze" className="btn-primary">
              Start an assessment
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-brand-200/70 border-y border-brand-200/70">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-4 py-5 transition hover:bg-white/50">
                  <div>
                    <p className="font-mono tracking-wider text-brand-900">{o.order_code}</p>
                    <p className="mt-1 text-xs text-brand-400">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="chip">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                </Link>
              </li>
            ))}
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
