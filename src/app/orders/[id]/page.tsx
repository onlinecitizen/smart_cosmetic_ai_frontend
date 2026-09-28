"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { api, Order } from "@/lib/api";

const STATUS_FLOW = [
  "DRAFT",
  "SUBMITTED",
  "VALIDATED",
  "SENT_TO_LAB",
  "PROCESSING",
  "READY",
  "DISPATCHED",
  "COMPLETED",
];

function OrderContent() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<Order>(`/api/v1/orders/${id}`).then(setOrder);
  }

  useEffect(load, [id]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post<Order>(`/api/v1/orders/${id}/submit`);
      load();
    } catch {
      setError("Could not submit the order.");
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

  if (!order) return <p className="text-brand-400 text-sm">Loading...</p>;

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const isTerminal = ["CANCELLED", "FAILED"].includes(order.status);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="card space-y-4">
        <div className="flex justify-between items-start">
          <h1 className="text-xl font-mono text-brand-800">{order.order_code}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{order.status}</span>
        </div>

        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s, i) => (
              <div
                key={s}
                className={`text-xs px-2 py-1 rounded-full ${
                  i <= currentIndex ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-300"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          {order.status === "DRAFT" && (
            <button className="btn-primary" onClick={submit} disabled={busy}>
              Submit order
            </button>
          )}
          {["DRAFT", "SUBMITTED", "VALIDATED"].includes(order.status) && (
            <button className="btn-secondary" onClick={cancel} disabled={busy}>
              Cancel order
            </button>
          )}
        </div>

        <p className="text-xs text-brand-400 pt-4 border-t border-brand-100">
          Order status is controlled by the backend and updates automatically as the laboratory
          reports progress; there is nothing further to do once it is submitted.
        </p>
      </div>
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
