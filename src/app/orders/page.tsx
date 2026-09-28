"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { api, Order } from "@/lib/api";

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>("/api/v1/orders")
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-brand-800">Your orders</h1>
      {loading ? (
        <p className="text-sm text-brand-400">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-brand-400">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="card flex justify-between items-center block">
              <span className="font-mono text-brand-700">{o.order_code}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{o.status}</span>
            </Link>
          ))}
        </div>
      )}
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
