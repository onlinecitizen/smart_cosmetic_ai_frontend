"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { api, Formula, Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function DashboardContent() {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Formula[]>("/api/v1/formulas"), api.get<Order[]>("/api/v1/orders")])
      .then(([f, o]) => {
        setFormulas(f);
        setOrders(o);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-800">Welcome back, {user?.full_name}</h1>
        <p className="text-brand-500 mt-1">Here&apos;s where things stand with your skin diagnostics and orders.</p>
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-brand-700">Ready for a new diagnostic?</h2>
          <p className="text-sm text-brand-500">Takes about 2 minutes with your camera.</p>
        </div>
        <Link href="/analyze" className="btn-primary">
          Start diagnostic
        </Link>
      </div>

      <div>
        <h2 className="font-semibold text-brand-700 mb-3">Your formulas</h2>
        {loading ? (
          <p className="text-sm text-brand-400">Loading...</p>
        ) : formulas.length === 0 ? (
          <p className="text-sm text-brand-400">No formulas yet. Start a diagnostic to generate one.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {formulas.map((f) => (
              <Link key={f.id} href={`/formula/${f.id}`} className="card hover:shadow-md transition-shadow block">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-sm text-brand-700">{f.formula_code}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      f.status === "VALIDATED" ? "bg-brand-100 text-brand-700" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
                <p className="text-xs text-brand-400 mt-2">{new Date(f.created_at).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-brand-700 mb-3">Your orders</h2>
        {loading ? (
          <p className="text-sm text-brand-400">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-brand-400">No orders yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="card hover:shadow-md transition-shadow block">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-sm text-brand-700">{o.order_code}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{o.status}</span>
                </div>
                <p className="text-xs text-brand-400 mt-2">{new Date(o.created_at).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
